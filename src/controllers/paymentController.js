import { createPreference, getPayment } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
import Queue from 'bull';
import pino from 'pino';

const { Usuario, Subscription } = models;

// Configuración de logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    err: pino.stdSerializers.err
  }
});

// Configuración de cola de procesamiento
const paymentQueue = new Queue('payment-processing', {
  redis: process.env.REDIS_URL,
  limiter: { max: 10, duration: 1000 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true
  }
});

// Estados de pago
const PAYMENT_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled'
};

// Procesar pago en background
paymentQueue.process(async (job) => {
  const { paymentId } = job.data;
  try {
    const payment = await getPayment(paymentId);
    
    if (payment.status === PAYMENT_STATUS.approved) {
      await processApprovedPayment(payment);
      logger.info({ paymentId }, 'Pago procesado exitosamente');
      return { success: true };
    }
    
    return { success: false, reason: 'unprocessed_status' };
  } catch (error) {
    logger.error({ paymentId, error }, 'Error procesando pago');
    throw error;
  }
});

// Controlador de webhook corregido
export const handleWebhook = async (req, res) => {
  try {
    // Verificación de firma
    const signature = req.headers['x-signature'] || req.headers['x-signature-sha256'];
    const isValid = verifyWebhookSignature(
      req.rawBody, 
      signature,
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Firma de webhook inválida', {
        headers: req.headers,
        rawBody: req.rawBody
      });
      return res.status(401).send('Invalid signature');
    }

    // Procesar evento
    const eventType = req.body.type;
    const paymentId = req.body.data?.id;

    if (eventType.includes('payment') && paymentId) {
      await paymentQueue.add({ paymentId });
      logger.info({ paymentId }, 'Pago agregado a cola de procesamiento');
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error en webhook', error);
    res.status(500).send('Error processing webhook');
  }
};

export const createCheckoutProPreference = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    const user = await Usuario.findByPk(userId);
    
    // Validación centralizada
    validatePreferenceData(userId, planType, user);

    const plan = PLANS_MERCADOPAGO[planType];
    const baseUrl = process.env.API_BASE_URL;

    // Configuración de preferencia con valores por defecto
    const preferenceData = {
      items: [
        {
          id: `sub-${planType}-${crypto.randomBytes(4).toString('hex')}`,
          title: `Suscripción ${planType.toUpperCase()}`,
          description: plan.description,
          quantity: 1,
          unit_price: plan.amount,
          currency_id: plan.currency_id,
          picture_url: process.env.PAYMENT_LOGO_URL || 'https://tuapp.com/logo.png'
        }
      ],
      payer: {
        email: user.correo_usuario,
        name: user.nombre_usuario,
        surname: user.apellido_usuario || '',
        identification: {
          type: "CC",
          number: user.documento_usuario || "00000000"
        },
        address: {
          zip_code: user.codigo_postal || "000000",
          street_name: user.direccion || "Sin especificar"
        }
      },
      payment_methods: {
        installments: 1,
        default_installments: 1,
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        excluded_payment_methods: []
      },
      external_reference: `USER_${userId}_PLAN_${planType}_${Date.now()}`,
      notification_url: `${baseUrl}/api/payments/webhook`,
      back_urls: {
        success: `${baseUrl}/api/payments/success-redirect?user_id=${userId}&plan_type=${planType}`,
        failure: `${baseUrl}/api/payments/failure-redirect?user_id=${userId}`,
        pending: `${baseUrl}/api/payments/pending-redirect?user_id=${userId}`
      },
      auto_return: "approved",
      metadata: generatePaymentMetadata(userId, planType),
      statement_descriptor: `QFINDER ${planType.toUpperCase()}`,
      date_of_expiration: new Date(Date.now() + 3600 * 1000 * 24).toISOString() // 24 horas de expiración
    };

    const preference = await createPreference(preferenceData);
    
    // Registrar la creación de preferencia en la base de datos
    await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: preference.id,
      tipo_suscripcion: planType,
      estado_suscripcion: 'pending',
      datos_pago: JSON.stringify(preference)
    });

    res.status(200).json({
      success: true,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preference_id: preference.id,
      expires_at: preference.date_of_expiration
    });
  } catch (error) {
    console.error('Error en createCheckoutProPreference:', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      planType: req.body.planType
    });
    
    res.status(error.statusCode || 500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Función mejorada para manejar eventos de pago
async function handlePaymentEvent(webhookData, res) {
  try {
    const paymentId = extractId(webhookData.data?.id || webhookData.id);
    const payment = await getPayment(paymentId);
    
    console.log(`💰 Procesando pago ${paymentId} con estado: ${payment.status}`);

    // Sistema de reintentos para pagos pendientes
    if (payment.status === PAYMENT_STATUS.pending.value) {
      await processPendingPaymentWithRetry(payment);
      return res.status(200).send('Pago pendiente procesado');
    }

    // Procesamiento según estado
    switch (payment.status) {
      case PAYMENT_STATUS.approved.value:
        await processApprovedPayment(payment);
        break;
      case PAYMENT_STATUS.rejected.value:
      case PAYMENT_STATUS.cancelled.value:
        await processRejectedPayment(payment);
        break;
      default:
        console.warn(`Estado de pago no manejado: ${payment.status}`);
    }

    res.status(200).send('Webhook procesado exitosamente');
  } catch (error) {
    console.error('Error en handlePaymentEvent:', {
      paymentId: webhookData.data?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).send('Error procesando evento de pago');
  }
}

// Procesamiento de pagos aprobados con mayor robustez
async function processApprovedPayment(payment) {
  const transaction = await models.sequelize.transaction();
  
  try {
    const { external_reference, id } = payment;

    if (!external_reference) {
      throw new Error('El pago no contiene external_reference');
    }

    const [_, userId, __, planType] = external_reference.split('_');
    if (!userId || !planType) {
      throw new Error(`Formato de external_reference inválido: ${external_reference}`);
    }

    const [user, existingPayment] = await Promise.all([
      Usuario.findByPk(userId, { transaction }),
      Subscription.findOne({ where: { mercado_pago_id: id }, transaction })
    ]);

    if (!user) throw new Error(`Usuario con ID ${userId} no encontrado`);
    if (existingPayment) {
      console.log(`Pago ${id} ya procesado. Actualizando datos...`);
      await existingPayment.update({ datos_pago: JSON.stringify(payment) }, { transaction });
      return await transaction.commit();
    }

    if (!Object.keys(PLANS_MERCADOPAGO).includes(planType)) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    const fechaInicio = new Date();
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaInicio.getMonth() + 1);

    await Subscription.create({
      usuario_id: userId,
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

    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId }, transaction }
    );

    await transaction.commit();
    console.log(`✅ Suscripción creada para usuario ${userId}`);
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

// Sistema de reintentos para pagos pendientes
async function processPendingPaymentWithRetry(payment, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY = 5000; // 5 segundos
  
  try {
    const updatedPayment = await getPayment(payment.id);
    
    if (updatedPayment.status !== PAYMENT_STATUS.pending.value) {
      return await handlePaymentStatusChange(updatedPayment);
    }

    if (attempt < MAX_ATTEMPTS) {
      setTimeout(() => {
        processPendingPaymentWithRetry(payment, attempt + 1);
      }, RETRY_DELAY);
    } else {
      console.warn(`Pago ${payment.id} sigue pendiente después de ${MAX_ATTEMPTS} intentos`);
    }
  } catch (error) {
    console.error(`Error en reintento ${attempt} para pago ${payment.id}:`, error);
  }
}

// Función para verificar pagos con caché
const paymentVerificationCache = new Map();

export const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un paymentId válido'
      });
    }

    // Verificar caché primero
    if (paymentVerificationCache.has(paymentId)) {
      const cached = paymentVerificationCache.get(paymentId);
      if (Date.now() - cached.timestamp < 30000) { // 30 segundos de caché
        return res.json(cached.data);
      }
    }

    const [payment, subscription] = await Promise.all([
      getPayment(paymentId),
      Subscription.findOne({ where: { mercado_pago_id: paymentId } })
    ]);

    const result = {
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        status_label: PAYMENT_STATUS[payment.status]?.label || 'Desconocido',
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        external_reference: payment.external_reference,
        payment_method: payment.payment_method_id
      },
      processed: !!subscription,
      subscription: subscription ? {
        id: subscription.id_subscription,
        plan_type: subscription.tipo_suscripcion,
        status: subscription.estado_suscripcion,
        start_date: subscription.fecha_inicio,
        renewal_date: subscription.fecha_renovacion
      } : null
    };

    // Almacenar en caché
    paymentVerificationCache.set(paymentId, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (error) {
    console.error('Error en verifyPayment:', {
      paymentId: req.params.paymentId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Error verificando pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controladores de redirección (mantenidos igual)
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
