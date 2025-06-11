import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
import axios from 'axios';
import crypto from 'crypto'; 
const { Usuario, Subscription } = models;

// Constantes mejor organizadas
const PAYMENT_STATUS = {
  pending: 'pending',
  approved: 'approved',
  authorized: 'authorized',
  in_process: 'in_process',
  in_mediation: 'in_mediation',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back'
};

const SUBSCRIPTION_STATUS = {
  active: 'active',
  pending: 'pending',
  cancelled: 'cancelled',
  paused: 'paused',
  expired: 'expired'
};

// Helpers mejorados
const extractId = (resource) => {
  if (!resource) return null;
  const parts = resource.split('/');
  return parts[parts.length - 1];
};

const parseExternalReference = (externalRef) => {
  try {
    if (!externalRef) throw new Error('External reference es requerida');
    
    const match = externalRef.match(/^USER_(\d+)_PLAN_(\w+)(?:_(\w+))?$/i);
    if (!match) throw new Error(`Formato de external_reference inválido: ${externalRef}`);
    
    return {
      userId: match[1],
      planType: match[2].toLowerCase(),
      additionalData: match[3] || null
    };
  } catch (error) {
    console.error('Error parsing external reference:', {
      externalRef,
      error: error.message
    });
    throw error;
  }
};

const calculateRenewalDate = (startDate, planType) => {
  const date = new Date(startDate);
  const plan = PLANS_MERCADOPAGO[planType];
  
  if (!plan) throw new Error(`Plan type ${planType} not found`);
  
  date.setHours(12, 0, 0, 0); // Establecer a mediodía para evitar problemas de zona horaria
  
  if (plan.frequency_type === 'months') {
    date.setMonth(date.getMonth() + (plan.frequency || 1));
  } else if (plan.frequency_type === 'days') {
    date.setDate(date.getDate() + (plan.frequency || 30));
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  
  return date;
};

// Controladores principales
export const createCheckoutProPreference = async (req, res) => {
};
async function processApprovedPayment(payment) {
  const externalRef = payment.external_reference;
  const [_, userId, __, planType] = externalRef.split('_');
  
  // Verificar si ya existe una suscripción para evitar duplicados
  const existingSub = await Subscription.findOne({
    where: { id_usuario: userId, estado_suscripcion: 'active' }
  });
  
  if (existingSub) {
    console.log(`Active subscription already exists for user ${userId}`);
    return;
  }

  // Crear nueva suscripción
  await Subscription.create({
    id_usuario: userId,
    mercado_pago_id: payment.id,
    plan_id: `plan-${planType}`,
    tipo_suscripcion: planType,
    estado_suscripcion: 'active',
    limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
    limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
    fecha_inicio: new Date(),
    fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
  });

  // Actualizar membresía del usuario
  await Usuario.update(
    { membresia: planType },
    { where: { id_usuario: userId } }
  );
  
  console.log(`Created subscription for user ${userId} with plan ${planType}`);
}
export const handleWebhook = async (req, res) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  let responded = false;
console.log('✅ handleWebhook ejecutado');
console.log('🧾 Cuerpo:', req.body);
console.log('📦 RawBody:', req.rawBody?.toString());

  const safeRespond = (status, message = null) => {
    if (!responded) {
      responded = true;
      if (message) {
        res.status(status).json({ error: message, reference: requestId });
      } else {
        res.sendStatus(status);
      }
    } else {
      console.warn(`⚠️ [${requestId}] Ya se envió una respuesta HTTP, ignorando respuesta duplicada`);
    }
  };

  try {
    // Log inicial del webhook recibido
    console.log(`🔔 [${requestId}] Webhook recibido`, {
      method: req.method,
      url: req.originalUrl,
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'x-signature': req.headers['x-signature'],
      },
      rawBodyLength: req.rawBody?.length || 0,
    });

    if (!req.rawBody || req.rawBody.length === 0) {
      console.error(`❌ [${requestId}] Cuerpo de solicitud vacío`);
      return safeRespond(400, 'Missing request body');
    }

    // Responder rápido para evitar timeouts
    res.sendStatus(200);
    responded = true;

    // 🔐 Verificar firma
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const signature = req.headers['x-signature'];
      if (!signature) {
        console.warn(`⚠️ [${requestId}] Faltan headers de firma`);
        return;
      }

      const requestBody = req.rawBody.toString('utf8');
      const isValid = verifyWebhookSignature(requestBody, signature);

      console.log(`🔍 [${requestId}] Firma verificada`, {
        isValid,
        hash: crypto.createHash('sha256').update(requestBody).digest('hex').slice(0, 16),
        signatureShort: signature.slice(0, 16) + '...',
      });

      if (!isValid) {
        console.warn(`⚠️ [${requestId}] Firma inválida`);
        return;
      }
    }

    // 📦 Parsear body del webhook
    let webhookData;
    try {
      webhookData = req.body || JSON.parse(req.rawBody.toString('utf8'));
    } catch (parseError) {
      console.error(`❌ [${requestId}] Error parseando body:`, parseError.message);
      return;
    }

    // 🔄 Identificar el tipo de evento
    const topic = req.query.topic || webhookData.topic;
    const id = req.query.id || webhookData.data?.id || extractId(webhookData.resource);

    if (!topic || !id) {
      console.warn(`⚠️ [${requestId}] Falta topic o ID`);
      return;
    }

    console.log(`📨 [${requestId}] Procesando webhook`, { topic, id });

    // 💰 Manejar pago
    if (topic === 'payment') {
      try {
        const payment = await getPayment(id);
        console.log(`💰 [${requestId}] Estado del pago: ${payment.status}`);

        switch (payment.status) {
          case PAYMENT_STATUS.approved:
          case PAYMENT_STATUS.authorized:
            await processApprovedPayment(payment);
            break;
          case PAYMENT_STATUS.pending:
          case PAYMENT_STATUS.in_process:
            await processPendingPayment(payment);
            break;
          case PAYMENT_STATUS.rejected:
          case PAYMENT_STATUS.cancelled:
            await processRejectedPayment(payment);
            break;
          default:
            console.warn(`⚠️ [${requestId}] Estado no manejado: ${payment.status}`);
        }
      } catch (paymentError) {
        console.error(`❌ [${requestId}] Error procesando pago:`, paymentError.message);
        return;
      }
    }

    // 🛒 Manejar orden de compra
    else if (topic === 'merchant_order') {
      try {
        await processMerchantOrder(webhookData.resource);
      } catch (orderError) {
        console.error(`❌ [${requestId}] Error procesando orden:`, orderError.message);
        return;
      }
    }

    // Final log
    console.log(`✅ [${requestId}] Webhook procesado correctamente`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error crítico en webhook:`, {
      message: error.message,
      stack: error.stack,
    });
    safeRespond(500, 'Internal server error');
  }
};


// Funciones de procesamiento mejoradas
async function processApprovedPayment(payment) {
  const transaction = await models.sequelize.transaction();
  try {
    const { external_reference, id } = payment;
    
    if (!external_reference) {
      throw new Error('El pago no contiene external_reference');
    }

    const { userId, planType } = parseExternalReference(external_reference);

    // Verificar si el pago ya fue procesado
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (existingPayment && existingPayment.estado_suscripcion === SUBSCRIPTION_STATUS.active) {
      console.log(`El pago ${id} ya fue procesado anteriormente.`);
      await transaction.commit();
      return;
    }

    // Validar que el plan exista
    if (!PLANS_MERCADOPAGO[planType]) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    const user = await Usuario.findByPk(userId, { transaction });
    if (!user) {
      throw new Error(`Usuario ${userId} no encontrado`);
    }

    // Calcular fechas de manera segura
    const fechaInicio = new Date();
    const fechaRenovacion = calculateRenewalDate(fechaInicio, planType);

    // Actualizar o crear la suscripción
    let subscription;
    if (existingPayment) {
      subscription = await existingPayment.update({
        estado_suscripcion: SUBSCRIPTION_STATUS.active,
        limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
        limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
        fecha_inicio: fechaInicio,
        fecha_renovacion: fechaRenovacion,
        datos_pago: JSON.stringify({
          ...JSON.parse(existingPayment.datos_pago || '{}'),
          id: payment.id,
          status: payment.status,
          date_approved: payment.date_approved,
          payment_method: payment.payment_method_id,
          amount: payment.transaction_amount
        })
      }, { transaction });
    } else {
      subscription = await Subscription.create({
        id_usuario: userId,
        mercado_pago_id: id,
        plan_id: `plan-${planType}`,
        tipo_suscripcion: planType,
        estado_suscripcion: SUBSCRIPTION_STATUS.active,
        limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
        limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
        fecha_inicio: fechaInicio,
        fecha_renovacion: fechaRenovacion,
        datos_pago: JSON.stringify({
          id: payment.id,
          status: payment.status,
          date_approved: payment.date_approved,
          payment_method: payment.payment_method_id,
          amount: payment.transaction_amount
        })
      }, { transaction });
    }

    // Actualizar el usuario
    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId }, transaction }
    );

    await transaction.commit();
    console.log(`✅ Suscripción ${subscription.estado_suscripcion} para usuario ${userId} - ID: ${subscription.id}`);

    // Aquí podrías enviar una notificación al usuario
    // await sendPaymentConfirmation(user, payment, subscription);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processApprovedPayment:', {
      paymentId: payment?.id,
      externalReference: payment?.external_reference,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

async function processSubscriptionUpdate(subscriptionData) {
  const transaction = await models.sequelize.transaction();
  try {
    const { id, action } = subscriptionData;
    console.log(`🔄 Procesando actualización de suscripción ${id} - Acción: ${action}`);

    const subscription = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (!subscription) {
      console.warn(`⚠️ Suscripción ${id} no encontrada en la base de datos`);
      await transaction.commit();
      return;
    }

    let newStatus = subscription.estado_suscripcion;
    let updateData = {
      datos_pago: JSON.stringify({
        ...JSON.parse(subscription.datos_pago || '{}'),
        last_update: new Date(),
        update_action: action
      })
    };

    switch (action) {
      case 'updated':
        // Actualizar datos si es necesario
        break;
      case 'cancelled':
        newStatus = SUBSCRIPTION_STATUS.cancelled;
        break;
      case 'paused':
        newStatus = SUBSCRIPTION_STATUS.paused;
        break;
      case 'activated':
        newStatus = SUBSCRIPTION_STATUS.active;
        break;
      case 'payment_created':
        await transaction.commit();
        return await processSubscriptionPayment(subscriptionData);
      default:
        console.log(`⚠️ Acción de suscripción no manejada: ${action}`);
    }

    updateData.estado_suscripcion = newStatus;

    await subscription.update(updateData, { transaction });
    await transaction.commit();

    console.log(`✅ Suscripción ${id} actualizada a estado: ${newStatus}`);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processSubscriptionUpdate:', {
      subscriptionId: subscriptionData?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

async function processSubscriptionPayment(paymentData) {
  const transaction = await models.sequelize.transaction();
  try {
    const { id } = paymentData;
    console.log(`💰 Procesando pago de suscripción ${id}`);

    const subscription = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (!subscription) {
      throw new Error(`Suscripción con ID ${id} no encontrada`);
    }

    // Actualizar fechas de renovación
    const newRenewalDate = calculateRenewalDate(new Date(), subscription.tipo_suscripcion);

    await subscription.update({
      fecha_renovacion: newRenewalDate,
      estado_suscripcion: SUBSCRIPTION_STATUS.active,
      datos_pago: JSON.stringify({
        ...JSON.parse(subscription.datos_pago || '{}'),
        last_payment: new Date(),
        payment_data: paymentData
      })
    }, { transaction });

    await transaction.commit();
    console.log(`✅ Pago de suscripción ${id} procesado. Nueva fecha de renovación: ${newRenewalDate}`);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processSubscriptionPayment:', {
      paymentId: paymentData?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

async function processMerchantOrder(orderResource) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const orderResponse = await axios.get(orderResource, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const order = orderResponse.data;
    console.log('📦 Detalles de la merchant_order recibida:', order.id);

    if (order.payments?.length) {
      for (const p of order.payments) {
        if (p.status === 'approved') {
          const paymentDetail = await getPayment(p.id);
          await processApprovedPayment(paymentDetail);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error al consultar merchant_order:', {
      mensaje: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    throw err;
  }
}

async function processPendingPayment(payment) {
  const transaction = await models.sequelize.transaction();
  try {
    const { external_reference, id } = payment;
    
    if (!external_reference) {
      console.warn('Pago pendiente sin external_reference:', id);
      await transaction.commit();
      return;
    }

    const { userId, planType } = parseExternalReference(external_reference);

    // Verificar si ya existe un registro para este pago
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (existingPayment) {
      await existingPayment.update({
        estado_suscripcion: SUBSCRIPTION_STATUS.pending,
        datos_pago: JSON.stringify({
          ...JSON.parse(existingPayment.datos_pago || '{}'),
          payment_status: 'pending',
          last_update: new Date()
        })
      }, { transaction });
    } else {
      await Subscription.create({
        id_usuario: userId,
        mercado_pago_id: id,
        plan_id: `plan-${planType}`,
        tipo_suscripcion: planType,
        estado_suscripcion: SUBSCRIPTION_STATUS.pending,
        datos_pago: JSON.stringify({
          id: payment.id,
          status: payment.status,
          date_created: payment.date_created,
          payment_method: payment.payment_method_id,
          amount: payment.transaction_amount
        })
      }, { transaction });
    }

    await transaction.commit();
    console.log(`🔄 Pago pendiente registrado: ${id}`);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processPendingPayment:', {
      paymentId: payment?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
}

async function processRejectedPayment(payment) {
  const transaction = await models.sequelize.transaction();
  try {
    const { external_reference, id } = payment;
    
    if (!external_reference) {
      console.warn('Pago rechazado sin external_reference:', id);
      await transaction.commit();
      return;
    }

    const { userId } = parseExternalReference(external_reference);

    // Actualizar el registro si existe
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (existingPayment) {
      await existingPayment.update({
        estado_suscripcion: SUBSCRIPTION_STATUS.cancelled,
        datos_pago: JSON.stringify({
          ...JSON.parse(existingPayment.datos_pago || '{}'),
          payment_status: 'rejected',
          rejection_reason: payment.status_detail,
          last_update: new Date()
        })
      }, { transaction });
    }

    await transaction.commit();
    console.log(`❌ Pago rechazado registrado: ${id}`);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processRejectedPayment:', {
      paymentId: payment?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Controladores de redirección
export const successRedirect = async (req, res) => {
  try {
    const { user_id, plan_type } = req.query;
    
    if (!user_id || !plan_type) {
      return res.status(400).send('Parámetros user_id y plan_type son requeridos');
    }

    const deeplink = `qfinder://payment/success?user_id=${user_id}&plan_type=${plan_type}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redireccionando...</title>
          <meta http-equiv="refresh" content="0; url=${deeplink}" />
          <script>window.location.href = "${deeplink}";</script>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            a { color: #0066cc; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>¡Pago exitoso!</h1>
          <p>Redirigiendo a la aplicación...</p>
          <a href="${deeplink}">Si no eres redirigido automáticamente, haz clic aquí</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en successRedirect:', error);
    res.status(500).send('Error procesando la redirección');
  }
};

export const failureRedirect = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).send('Parámetro user_id es requerido');
    }

    const deeplink = `qfinder://payment/failure?user_id=${user_id}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redireccionando...</title>
          <meta http-equiv="refresh" content="0; url=${deeplink}" />
          <script>window.location.href = "${deeplink}";</script>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            a { color: #0066cc; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>¡Pago fallido!</h1>
          <p>Redirigiendo a la aplicación...</p>
          <a href="${deeplink}">Si no eres redirigido automáticamente, haz clic aquí</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en failureRedirect:', error);
    res.status(500).send('Error procesando la redirección');
  }
};

export const pendingRedirect = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).send('Parámetro user_id es requerido');
    }

    const deeplink = `qfinder://payment/pending?user_id=${user_id}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redireccionando...</title>
          <meta http-equiv="refresh" content="0; url=${deeplink}" />
          <script>window.location.href = "${deeplink}";</script>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            a { color: #0066cc; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>¡Pago pendiente!</h1>
          <p>Estamos procesando tu pago. Redirigiendo a la aplicación...</p>
          <a href="${deeplink}">Si no eres redirigido automáticamente, haz clic aquí</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en pendingRedirect:', error);
    res.status(500).send('Error procesando la redirección');
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un paymentId válido',
        code: 'MISSING_PAYMENT_ID'
      });
    }

    const payment = await getPayment(paymentId);
    const subscription = await Subscription.findOne({
      where: { mercado_pago_id: paymentId }
    });

    // Verificar si el pago está aprobado pero no se procesó
    if ((payment.status === PAYMENT_STATUS.approved || payment.status === PAYMENT_STATUS.authorized) && !subscription) {
      console.warn(`⚠️ Pago aprobado pero no procesado: ${paymentId}`);
      await processApprovedPayment(payment);
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        external_reference: payment.external_reference
      },
      processed: !!subscription,
      subscription: subscription ? {
        id: subscription.id,
        plan_type: subscription.tipo_suscripcion,
        status: subscription.estado_suscripcion,
        start_date: subscription.fecha_inicio,
        renewal_date: subscription.fecha_renovacion
      } : null
    });
  } catch (error) {
    console.error('Error en verifyPayment:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      params: req.params,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Error verificando pago',
      code: 'PAYMENT_VERIFICATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      reference: `VERIFY-ERR-${Date.now()}`
    });
  }
};