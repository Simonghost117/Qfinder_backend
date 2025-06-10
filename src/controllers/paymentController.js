import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
import axios from 'axios';
const { Usuario, Subscription } = models;

// Mapeo de estados de pago
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

// Función para registrar errores en un sistema de monitoreo
const notifyErrorToMonitoringSystem = (error, context = {}) => {
  console.error('🚨 Error crítico:', { error: error.message, ...context });
  // Aquí podrías integrar con Sentry, Rollbar, etc.
};

// Función para extraer el ID de un recurso de MercadoPago
const extractId = (resource) => {
  if (!resource) return null;
  const parts = resource.split('/');
  return parts[parts.length - 1];
};

// Función para procesar pagos según su estado
async function processPaymentBasedOnStatus(payment) {
  console.log(`🔍 Procesando pago ${payment.id} con estado: ${payment.status}`);

  switch (payment.status) {
    case PAYMENT_STATUS.approved:
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

// Función para procesar pagos aprobados
async function processApprovedPayment(payment) {
  const transaction = await models.sequelize.transaction();
  try {
    const { external_reference, id } = payment;

    if (!external_reference) {
      throw new Error('El pago no contiene external_reference');
    }

    // Formato esperado: USER_123_PLAN_plus
    const [_, userId, __, planType] = external_reference.split('_');

    if (!userId || !planType) {
      throw new Error(`Formato de external_reference inválido: ${external_reference}`);
    }

    const user = await Usuario.findByPk(userId, { transaction });
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    // Verifica si ya se procesó este pago
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (existingPayment) {
      console.log(`ℹ️ El pago ${id} ya fue procesado anteriormente.`);
      await transaction.commit();
      return;
    }

    // Verifica que el plan sea válido
    const planKeys = Object.keys(PLANS_MERCADOPAGO);
    if (!planKeys.includes(planType)) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    // Crea o actualiza la suscripción en la DB
    const fechaInicio = new Date();
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaInicio.getMonth() + 1);

    const [subscription] = await Subscription.upsert({
      id_usuario: userId,
      mercado_pago_id: id,
      plan_id: `plan-${planType}`,
      tipo_suscripcion: planType,
      estado_suscripcion: 'active',
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: fechaInicio,
      fecha_renovacion: fechaRenovacion,
      datos_pago: JSON.stringify(payment)
    }, { transaction });

    // Actualiza el estado de membresía del usuario
    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId }, transaction }
    );

    await transaction.commit();
    console.log(`✅ Suscripción actualizada para el usuario ${userId}`);
    console.log(`🔄 Membresía del usuario ${userId} actualizada a ${planType}`);

    // Aquí podrías añadir notificaciones al usuario (email, push, etc.)
  } catch (error) {
    await transaction.rollback();
    notifyErrorToMonitoringSystem(error, {
      paymentId: payment?.id,
      action: 'processApprovedPayment'
    });
    throw error;
  }
}

// Función para procesar pagos pendientes
async function processPendingPayment(payment) {
  console.log(`⏳ Procesando pago pendiente: ${payment.id}`);
  // Aquí podrías:
  // 1. Registrar el pago pendiente en tu base de datos
  // 2. Enviar una notificación al usuario
  // 3. Programar una verificación posterior
}

// Función para procesar pagos rechazados
async function processRejectedPayment(payment) {
  console.log(`❌ Procesando pago rechazado: ${payment.id}`);
  // Aquí podrías:
  // 1. Notificar al usuario sobre el pago rechazado
  // 2. Ofrecer alternativas de pago
  // 3. Registrar el motivo del rechazo para análisis
}

// Controlador principal del webhook
export const handleWebhook = async (req, res) => {
  console.log('🔔 Nuevo webhook recibido', {
    headers: req.headers,
    body: req.body,
    query: req.query,
    ip: req.ip
  });

  try {
    // Verificar firma del webhook
    const signature = req.headers['x-signature'];
    if (!signature) {
      console.warn('⚠️ Webhook sin firma:', req.headers);
      return res.sendStatus(401);
    }

    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      console.warn('⚠️ Firma de webhook inválida');
      return res.sendStatus(403);
    }

    // Obtener datos del webhook de diferentes formas posibles
    const eventData = req.body || {};
    const queryParams = req.query || {};

    // Manejar formato alternativo de notificación
    if (eventData.action === 'payment.created' && eventData.data?.id) {
      const payment = await getPayment(eventData.data.id);
      await processPaymentBasedOnStatus(payment);
      return res.sendStatus(200);
    }

    // Determinar tipo de evento y ID
    const topic = queryParams.type || eventData.type;
    const id = queryParams['data.id'] || (eventData.data && eventData.data.id);

    if (!topic || !id) {
      console.warn('⚠️ Webhook recibido sin topic o id válido:', {
        headers: req.headers,
        body: eventData,
        query: queryParams
      });
      return res.sendStatus(400);
    }

    console.log(`📨 Webhook recibido - Tipo: ${topic}, ID: ${id}`);

    // Manejar diferentes tipos de eventos
    if (topic === 'payment') {
      const payment = await getPayment(id);
      await processPaymentBasedOnStatus(payment);
    } else if (topic === 'merchant_order') {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const resource = eventData.resource;

      try {
        const orderResponse = await axios.get(resource, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const order = orderResponse.data;
        console.log('📦 Detalles de la merchant_order recibida:', order);

        if (order.payments?.length) {
          for (const p of order.payments) {
            if (p.status === 'approved') {
              const paymentDetail = await getPayment(p.id);
              await processApprovedPayment(paymentDetail);
            }
          }
        }
      } catch (err) {
        notifyErrorToMonitoringSystem(err, {
          action: 'merchant_order_processing',
          orderId: id
        });
        console.error('❌ Error al consultar merchant_order:', err.message);
      }
    }

    console.log('✅ Webhook procesado correctamente', {
      topic,
      id,
      status: payment?.status || 'N/A'
    });
    res.sendStatus(200);
  } catch (error) {
    notifyErrorToMonitoringSystem(error, {
      action: 'handleWebhook',
      body: req.body
    });
    console.error('❌ Error en handleWebhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      details: error.message
    });
  }
};

// Endpoint para verificación del webhook
export const verifyWebhookConfig = async (req, res) => {
  try {
    const challenge = req.query.challenge;
    if (!challenge) {
      return res.status(400).send('Missing challenge parameter');
    }
    
    console.log('✅ Webhook verification challenge received');
    res.status(200).send(challenge);
  } catch (error) {
    notifyErrorToMonitoringSystem(error, {
      action: 'verifyWebhookConfig'
    });
    console.error('Error verifying webhook:', error);
    res.status(500).send('Error verifying webhook');
  }
};

// Controlador para verificar estado de pago
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
        amount: payment.amount,
        currency: payment.currency,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        external_reference: payment.external_reference
      },
      processed: !!subscription,
      subscription
    });
  } catch (error) {
    notifyErrorToMonitoringSystem(error, {
      action: 'verifyPayment',
      paymentId: req.params.paymentId
    });
    console.error('Error en verifyPayment:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando pago',
      details: error.message
    });
  }
};

// Controladores de redirección
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


export const createCheckoutProPreference = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    if (!userId || !planType) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: userId y planType'
      });
    }

    if (!PLANS_MERCADOPAGO[planType]) {
      return res.status(400).json({
        success: false,
        error: `Tipo de plan inválido: ${planType}`
      });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    const baseUrl = process.env.API_BASE_URL;

    const preferenceData = {
      items: [
        {
          id: `sub-${planType}`,
          title: `Suscripción ${planType.toUpperCase()}`,
          description: plan.description,
          quantity: 1,
          unit_price: plan.amount,
          currency_id: plan.currency_id,
          picture_url: 'https://tuapp.com/logo.png'
        }
      ],
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
      external_reference: `USER_${userId}_PLAN_${planType}`,
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

    const preference = await createPreference(preferenceData);
    
    res.status(200).json({
      success: true,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preference_id: preference.id
    });
  } catch (error) {
    console.error('Error en createCheckoutProPreference:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al crear preferencia de pago',
      details: error.message
    });
  }
};