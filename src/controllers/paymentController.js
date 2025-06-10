import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
import axios from 'axios';
const { Usuario, Subscription } = models;

// Versión mejorada del controlador de pagos
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

// Helper para extraer ID de recursos de MercadoPago
const extractId = (resource) => {
  if (!resource) return null;
  const parts = resource.split('/');
  return parts[parts.length - 1];
};

// Helper para parsear external_reference
const parseExternalReference = (externalRef) => {
  const match = externalRef.match(/^USER_(\d+)_PLAN_(\w+)$/i);
  if (!match) throw new Error(`Formato de external_reference inválido: ${externalRef}`);
  return {
    userId: match[1],
    planType: match[2].toLowerCase()
  };
};

export const createCheckoutProPreference = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    // Validación mejorada
    if (!userId || !planType) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: userId y planType'
      });
    }

    const plan = PLANS_MERCADOPAGO[planType.toLowerCase()];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Tipo de plan inválido: ${planType}`,
        availablePlans: Object.keys(PLANS_MERCADOPAGO)
      });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const baseUrl = process.env.API_BASE_URL;
    const externalRef = `USER_${userId}_PLAN_${planType.toUpperCase()}`;

    const preferenceData = {
      items: [{
        title: `Suscripción ${planType.toUpperCase()}`,
        description: plan.description,
        quantity: 1,
        unit_price: plan.amount,
        currency_id: plan.currency_id,
        picture_url: 'https://tuapp.com/logo.png'
      }],
      payer: {
        email: user.correo_usuario,
        name: user.nombre_usuario,
        surname: user.apellido_usuario || '',
        identification: {
          type: "CC",
          number: user.documento_usuario || "00000000"
        }
      },
      payment_methods: {
        installments: 1,
        default_installments: 1,
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }]
      },
      external_reference: externalRef,
      notification_url: `${baseUrl}/api/payments/webhook`,
      back_urls: {
        success: `${baseUrl}/api/payments/success-redirect?user_id=${userId}&plan_type=${planType}`,
        failure: `${baseUrl}/api/payments/failure-redirect?user_id=${userId}`,
        pending: `${baseUrl}/api/payments/pending-redirect?user_id=${userId}`
      },
      auto_return: "approved",
      metadata: {
        user_id: userId,
        plan_type: planType,
        app: "qfinder",
        deeplink_success: `qfinder://payment/success?user_id=${userId}&plan_type=${planType}`,
        deeplink_failure: `qfinder://payment/failure?user_id=${userId}`,
        deeplink_pending: `qfinder://payment/pending?user_id=${userId}`
      },
      statement_descriptor: `QFINDER ${planType.toUpperCase()}`
    };

    // Agregar lógica de suscripción recurrente si corresponde
    if (plan.frequency && plan.frequency_type) {
      preferenceData.auto_recurring = {
        frequency: plan.frequency,
        frequency_type: plan.frequency_type,
        transaction_amount: plan.amount,
        currency_id: plan.currency_id
      };
    }

    const preference = await createPreference(preferenceData);
    
    res.status(200).json({
      success: true,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preference_id: preference.id,
      external_reference: externalRef
    });
  } catch (error) {
    console.error('Error en createCheckoutProPreference:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ 
      success: false,
      error: 'Error al crear preferencia de pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    // Verificación de firma del webhook (recomendado)
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const signature = req.headers['x-signature'];
      const isValid = verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        console.warn('⚠️ Webhook con firma inválida recibido');
        return res.sendStatus(403);
      }
    }

    // Manejo de webhooks de suscripción
    const subscriptionType = req.query.type || req.body.type;
    const subscriptionId = req.query['data.id'] || req.body.data?.id || req.body.id;

    if (subscriptionType && subscriptionId) {
      console.log('📨 Webhook de suscripción recibido:', { 
        type: subscriptionType,
        id: subscriptionId,
        action: req.body.action 
      });

      switch (subscriptionType) {
        case 'subscription_preapproval':
          await processSubscriptionUpdate(req.body);
          return res.sendStatus(200);
        case 'subscription_authorized_payment':
          await processSubscriptionPayment(req.body);
          return res.sendStatus(200);
        default:
          console.warn(`⚠️ Tipo de suscripción no manejado: ${subscriptionType}`);
          return res.sendStatus(200); // Responder 200 aunque no lo manejemos
      }
    }

    // Manejo de webhooks tradicionales
    const topic = req.query.topic || req.body.topic;
    const id = req.query.id || req.body.data?.id || extractId(req.body.resource);

    if (!topic || !id) {
      console.warn('⚠️ Webhook recibido sin topic o id válido:', {
        headers: req.headers,
        body: req.body,
        query: req.query
      });
      return res.sendStatus(400);
    }

    console.log('📨 Webhook recibido:', { topic, id });

    if (topic === 'payment') {
      const payment = await getPayment(id);
      console.log('💰 Estado del pago:', payment.status);

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
          console.log(`⚠️ Estado de pago no manejado: ${payment.status}`);
      }
    } 
    else if (topic === 'merchant_order') {
      await processMerchantOrder(req.body.resource);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en handleWebhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      query: req.query
    });
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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

    if (existingPayment) {
      console.log(`El pago ${id} ya fue procesado anteriormente.`);
      await transaction.commit();
      return;
    }

    // Validar que el plan exista
    if (!PLANS_MERCADOPAGO[planType]) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    // Calcular fechas de manera segura
    const fechaInicio = new Date();
    const fechaRenovacion = new Date();
    fechaRenovacion.setDate(1); // Evitar problemas con fin de mes
    fechaRenovacion.setMonth(fechaInicio.getMonth() + 1);

    // Crear la suscripción
    const subscription = await Subscription.create({
      id_usuario: userId,
      mercado_pago_id: id,
      plan_id: `plan-${planType}`,
      tipo_suscripcion: planType,
      estado_suscripcion: 'active',
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

    // Actualizar el usuario
    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId }, transaction }
    );

    await transaction.commit();
    console.log(`✅ Suscripción creada para usuario ${userId} - ID: ${subscription.id}`);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en processApprovedPayment:', {
      paymentId: payment?.id,
      error: error.message,
      stack: error.stack
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
        // Aquí podrías actualizar otros datos si es necesario
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'paused':
        newStatus = 'paused';
        break;
      case 'activated':
        newStatus = 'active';
        break;
      case 'payment_created':
        // Manejar nuevo pago de suscripción recurrente
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
      error: error.message,
      stack: error.stack
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
    const newRenewalDate = new Date();
    newRenewalDate.setDate(1);
    newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

    await subscription.update({
      fecha_renovacion: newRenewalDate,
      estado_suscripcion: 'active',
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
      error: error.message,
      stack: error.stack
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
      stack: err.stack
    });
    throw err;
  }
}

async function processPendingPayment(payment) {
  console.log(`🔄 Procesando pago pendiente: ${payment.id}`);
  // Aquí podrías registrar el pago pendiente en tu base de datos
  // o enviar una notificación al usuario
}

async function processRejectedPayment(payment) {
  console.log(`❌ Procesando pago rechazado: ${payment.id}`);
  // Aquí podrías notificar al usuario o registrar el rechazo
}

// Los controladores de redirección se mantienen igual
export const successRedirect = async (req, res) => {
  const { user_id, plan_type } = req.query;
  const deeplink = `qfinder://payment/success?user_id=${user_id}&plan_type=${plan_type}`;
  
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=${deeplink}" />
        <script>window.location.href = "${deeplink}";</script>
      </head>
      <body>
        <p>Redirigiendo a la aplicación...</p>
        <a href="${deeplink}">Si no eres redirigido, haz clic aquí</a>
      </body>
    </html>
  `);
};

export const failureRedirect = async (req, res) => {
  const { user_id } = req.query;
  const deeplink = `qfinder://payment/failure?user_id=${user_id}`;
  
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=${deeplink}" />
        <script>window.location.href = "${deeplink}";</script>
      </head>
      <body>
        <p>Redirigiendo a la aplicación...</p>
        <a href="${deeplink}">Si no eres redirigido, haz clic aquí</a>
      </body>
    </html>
  `);
};

export const pendingRedirect = async (req, res) => {
  const { user_id } = req.query;
  const deeplink = `qfinder://payment/pending?user_id=${user_id}`;
  
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=${deeplink}" />
        <script>window.location.href = "${deeplink}";</script>
      </head>
      <body>
        <p>Redirigiendo a la aplicación...</p>
        <a href="${deeplink}">Si no eres redirigido, haz clic aquí</a>
      </body>
    </html>
  `);
};

export const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un paymentId válido'
      });
    }

    const payment = await getPayment(paymentId);
    const subscription = await Subscription.findOne({
      where: { mercado_pago_id: paymentId }
    });

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
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
        renewal_date: subscription.fecha_renovacion
      } : null
    });
  } catch (error) {
    console.error('Error en verifyPayment:', {
      error: error.message,
      stack: error.stack,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Error verificando pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};