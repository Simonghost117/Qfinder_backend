import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
const { Usuario, Subscription } = models;

// Estados de pago ampliados
const PAYMENT_STATUS = {
  pending: 'pending',
  approved: 'approved',
  authorized: 'authorized',
  in_process: 'in_process',
  in_mediation: 'in_mediation',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
  expired: 'expired'
};

const notifyErrorToMonitoringSystem = (error, context = {}) => {
  console.error('🚨 Error crítico:', { 
    error: error.message, 
    stack: error.stack,
    ...context 
  });
  // Aquí podrías integrar con Sentry, Rollbar, etc.
};

async function processApprovedPayment(payment) {
  const transaction = await models.sequelize.transaction();
  try {
    const { external_reference, id, status } = payment;

    if (!external_reference) {
      throw new Error('El pago no contiene external_reference');
    }

    // Formato: USER_<userId>_PLAN_<planType>
    const [_, userId, __, planType] = external_reference.split('_');

    if (!userId || !planType) {
      throw new Error(`Formato de external_reference inválido: ${external_reference}`);
    }

    const user = await Usuario.findByPk(userId, { transaction });
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar si el pago ya fue procesado
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id },
      transaction
    });

    if (existingPayment) {
      console.log(`ℹ️ El pago ${id} ya fue procesado anteriormente.`);
      await transaction.commit();
      return { processed: false, reason: 'already_processed' };
    }

    // Validar tipo de plan
    const planKeys = Object.keys(PLANS_MERCADOPAGO);
    if (!planKeys.includes(planType)) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    // Calcular fechas de inicio y renovación
    const fechaInicio = new Date();
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaInicio.getMonth() + 1);

    // Crear o actualizar suscripción
    const [subscription] = await Subscription.upsert({
      id_usuario: userId,
      mercado_pago_id: id,
      plan_id: `plan-${planType}`,
      tipo_suscripcion: planType,
      estado_suscripcion: status === 'approved' ? 'active' : status,
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: fechaInicio,
      fecha_renovacion: fechaRenovacion,
      datos_pago: JSON.stringify(payment)
    }, { 
      transaction,
      returning: true
    });

    // Actualizar membresía del usuario solo si fue aprobado
    if (status === 'approved') {
      await Usuario.update(
        { membresia: planType },
        { where: { id_usuario: userId }, transaction }
      );
    }

    await transaction.commit();
    console.log(`✅ Suscripción ${status} para el usuario ${userId}`);
    return { processed: true, subscription };
  } catch (error) {
    await transaction.rollback();
    notifyErrorToMonitoringSystem(error, {
      paymentId: payment?.id,
      action: 'processApprovedPayment'
    });
    throw error;
  }
}

export const handleWebhook = async (req, res) => {
  console.log('🔔 Nuevo webhook recibido', {
    headers: req.headers,
    query: req.query
  });

  // Responder inmediatamente a MercadoPago
  res.status(200).end();

  try {
    // Verificar si es un ping de prueba
    if (req.query.type === 'test') {
      console.log('✅ Webhook de prueba recibido');
      return;
    }

    // Verificar firma del webhook
    const signature = req.headers['x-signature'] || req.headers['x-signature-sha256'];
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.warn('⚠️ Firma no proporcionada o secreto no configurado');
      return;
    }

    const isValid = verifyWebhookSignature(req.rawBody || req.body, signature, webhookSecret);
    if (!isValid) {
      console.warn('⚠️ Firma de webhook inválida');
      return;
    }

    // Procesar según el tipo de webhook (de manera asíncrona)
    const eventType = req.body.type || req.query.type;
    console.log(`📌 Tipo de evento: ${eventType}`);

    // Usar setTimeout o cola de mensajes para procesar en segundo plano
    setTimeout(async () => {
      try {
        switch (eventType) {
          case 'payment':
          case 'payment.updated':
            const paymentId = req.body.data?.id || req.query['data.id'];
            if (!paymentId) {
              console.error('Payment ID missing');
              return;
            }
            
            const payment = await getPayment(paymentId);
            await processApprovedPayment(payment);
            break;
          
          case 'subscription':
          case 'subscription_preapproval':
            console.log('Evento de suscripción recibido:', req.body);
            break;
          
          default:
            console.warn(`⚠️ Tipo de webhook no manejado: ${eventType}`);
        }
      } catch (error) {
        console.error('❌ Error en procesamiento asíncrono:', error);
      }
    }, 0);

  } catch (error) {
    console.error('❌ Error en handleWebhook:', error);
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
        app: "qfinder"
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