import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
import Queue from 'bull';
import pino from 'pino';

const { Usuario, Subscription } = models;

// Configuración de logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  serializers: {
    err: pino.stdSerializers.err
  }
});

// Configuración de cola de procesamiento
const paymentQueue = new Queue('payment-processing', {
  redis: process.env.REDIS_URL,
  limiter: {
    max: 10,
    duration: 1000
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: 100
  }
});

// Estados de pago
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

// Estados finales (no requieren más procesamiento)
const FINAL_STATUSES = [
  PAYMENT_STATUS.approved,
  PAYMENT_STATUS.rejected,
  PAYMENT_STATUS.cancelled,
  PAYMENT_STATUS.refunded,
  PAYMENT_STATUS.charged_back
];

// Procesar pago aprobado
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
      logger.info({ paymentId: id }, 'Pago ya procesado anteriormente');
      await transaction.commit();
      return { processed: false, reason: 'already_processed' };
    }

    // Validar tipo de plan
    const planKeys = Object.keys(PLANS_MERCADOPAGO);
    if (!planKeys.includes(planType)) {
      throw new Error(`Tipo de plan inválido: ${planType}`);
    }

    // Buscar pagos relacionados para evitar duplicados
    const relatedPayments = await searchPayments({
      external_reference: external_reference,
      sort: 'date_created',
      criteria: 'desc'
    });

    // Verificar si hay un pago aprobado más reciente
    const newerApprovedPayment = relatedPayments.find(p => 
      p.status === PAYMENT_STATUS.approved && 
      p.id !== id &&
      new Date(p.date_created) > new Date(payment.date_created)
    );

    if (newerApprovedPayment) {
      logger.warn({ 
        currentPayment: id, 
        newerPayment: newerApprovedPayment.id 
      }, 'Existe un pago aprobado más reciente');
      await transaction.commit();
      return { processed: false, reason: 'newer_payment_exists' };
    }

    // Calcular fechas de inicio y renovación
    const fechaInicio = new Date();
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaInicio.getMonth() + 1);

    // Determinar estado de la suscripción
    let subscriptionStatus = 'pending';
    if (status === PAYMENT_STATUS.approved) subscriptionStatus = 'active';
    else if ([PAYMENT_STATUS.rejected, PAYMENT_STATUS.cancelled].includes(status)) subscriptionStatus = 'cancelled';

    // Crear o actualizar suscripción
    const [subscription] = await Subscription.upsert({
      id_usuario: userId,
      mercado_pago_id: id,
      plan_id: `plan-${planType}`,
      tipo_suscripcion: planType,
      estado_suscripcion: subscriptionStatus,
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
    if (status === PAYMENT_STATUS.approved) {
      await Usuario.update(
        { membresia: planType },
        { where: { id_usuario: userId }, transaction }
      );
      logger.info({ userId, planType }, 'Membresía de usuario actualizada');
    }

    await transaction.commit();
    logger.info({ paymentId: id, status }, 'Suscripción procesada correctamente');
    return { processed: true, subscription };
  } catch (error) {
    await transaction.rollback();
    logger.error({ 
      error: error.message,
      stack: error.stack,
      paymentId: payment?.id 
    }, 'Error procesando pago aprobado');
    throw error;
  }
}

// Procesar pago en background con reintentos
async function processPaymentBackground(job) {
  const { paymentId, attempt = 1 } = job.data;
  
  try {
    logger.info({ paymentId, attempt }, 'Procesando pago en background');
    
    const payment = await getPayment(paymentId);
    
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // Si el pago está pendiente y no es el último intento, reintentar más tarde
    if (payment.status === PAYMENT_STATUS.pending && attempt < 3) {
      logger.info({ paymentId, attempt }, 'Pago pendiente, se reintentará más tarde');
      throw new Error('Payment still pending');
    }

    // Si el estado es final, procesar
    if (FINAL_STATUSES.includes(payment.status)) {
      await processApprovedPayment(payment);
      logger.info({ paymentId }, 'Pago procesado correctamente');
      return { success: true, paymentId };
    }

    // Para otros estados no finales
    logger.warn({ 
      paymentId, 
      status: payment.status 
    }, 'Estado de pago no requiere procesamiento');
    return { success: false, reason: 'non_final_status' };
  } catch (error) {
    logger.error({ 
      paymentId, 
      attempt,
      error: error.message 
    }, 'Error procesando pago');
    
    if (attempt < 3) {
      throw error; // Bull manejará el reintento automáticamente
    }
    
    // Notificar error crítico después del último intento
    notifyCriticalError(error, { paymentId });
    throw error;
  }
}

// Configurar el procesador de la cola
paymentQueue.process(processPaymentBackground);

// Manejar eventos de la cola
paymentQueue.on('completed', (job, result) => {
  logger.info({ 
    jobId: job.id, 
    paymentId: job.data.paymentId,
    result 
  }, 'Procesamiento de pago completado');
});

paymentQueue.on('failed', (job, err) => {
  logger.error({ 
    jobId: job.id, 
    paymentId: job.data.paymentId,
    attemptsMade: job.attemptsMade,
    error: err.message 
  }, 'Procesamiento de pago fallido');
});

// Controlador de webhook
export const handleWebhook = async (req, res) => {
  // Responder inmediatamente
  res.status(200).send('OK');
  
  try {
    // Verificar si es un ping de prueba
    if (req.query.type === 'test') {
      logger.info('Webhook de prueba recibido');
      return;
    }

    // Verificación de firma
    const signature = req.headers['x-signature'] || req.headers['x-signature-sha256'];
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      logger.warn('Firma no proporcionada o secreto no configurado');
      return;
    }

    const isValid = verifyWebhookSignature(req.rawBody || req.body, signature, webhookSecret);
    if (!isValid) {
      logger.warn('Firma de webhook inválida');
      return;
    }

    // Procesamiento real
    const eventType = req.body.type || req.query.type;
    const paymentId = req.body.data?.id || req.query['data.id'];
    
    if (eventType.includes('payment') && paymentId) {
      logger.info({ paymentId }, 'Nuevo evento de pago recibido');
      
      // Agregar a la cola de procesamiento
      await paymentQueue.add({ paymentId }, {
        jobId: `payment-${paymentId}`, // ID único para evitar duplicados
        priority: 1 // Prioridad alta para webhooks
      });
    }
  } catch (error) {
    logger.error({ 
      error: error.message,
      stack: error.stack 
    }, 'Error en el manejo del webhook');
  }
};

// Controlador para verificar estado de pago
export const verifyPayment = async (req, res) => {
  const TIMEOUT = 8000; // 8 segundos
  
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un paymentId válido'
      });
    }

    // Usar Promise.race para timeout
    const paymentPromise = Promise.all([
      getPayment(paymentId),
      Subscription.findOne({ where: { mercado_pago_id: paymentId } })
    ]);

    const [payment, subscription] = await Promise.race([
      paymentPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al verificar pago')), TIMEOUT)
    ]);

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
        external_reference: payment.external_reference,
        payment_method: payment.payment_method_id
      },
      processed: !!subscription,
      subscription: subscription ? {
        plan_id: subscription.plan_id,
        tipo_suscripcion: subscription.tipo_suscripcion,
        estado_suscripcion: subscription.estado_suscripcion,
        fecha_inicio: subscription.fecha_inicio,
        fecha_renovacion: subscription.fecha_renovacion
      } : null
    });
  } catch (error) {
    logger.error({
      error: error.message,
      paymentId: req.params.paymentId,
      action: 'verifyPayment'
    }, 'Error verificando pago');
    
    const status = error.message.includes('Timeout') ? 504 : 500;
    res.status(status).json({
      success: false,
      error: error.message.includes('Timeout') ? 
        'Tiempo de espera agotado al verificar el pago' : 
        'Error verificando pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controladores de redirección mejorados
const buildRedirectResponse = (url, message) => `
<html>
  <head>
    <title>Redireccionando...</title>
    <meta http-equiv="refresh" content="0; url=${url}" />
    <script>
      window.location.href = "${url}";
      setTimeout(function() {
        document.getElementById('manual-link').style.display = 'block';
      }, 2000);
    </script>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
      #manual-link { display: none; margin-top: 20px; }
      .spinner { margin: 20px auto; width: 50px; height: 50px; border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="spinner"></div>
    <p>${message}</p>
    <div id="manual-link">
      <a href="${url}">Si no eres redirigido automáticamente, haz clic aquí</a>
    </div>
  </body>
</html>
`;

export const successRedirect = async (req, res) => {
  const { user_id, plan_type } = req.query;
  const deeplink = `qfinder://payment/success?user_id=${user_id}&plan_type=${plan_type}`;
  res.send(buildRedirectResponse(deeplink, '¡Pago aprobado! Redirigiendo a la aplicación...'));
};

export const failureRedirect = async (req, res) => {
  const { user_id } = req.query;
  const deeplink = `qfinder://payment/failure?user_id=${user_id}`;
  res.send(buildRedirectResponse(deeplink, 'Pago no completado. Redirigiendo a la aplicación...'));
};

export const pendingRedirect = async (req, res) => {
  const { user_id } = req.query;
  const deeplink = `qfinder://payment/pending?user_id=${user_id}`;
  res.send(buildRedirectResponse(deeplink, 'Pago pendiente. Redirigiendo a la aplicación...'));
};

// Crear preferencia de pago mejorada
export const createCheckoutProPreference = async (req, res) => {
  const TIMEOUT = 10000; // 10 segundos
  
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
        error: `Tipo de plan inválido: ${planType}`,
        availablePlans: Object.keys(PLANS_MERCADOPAGO)
      });
    }

    // Verificar usuario con timeout
    const user = await Promise.race([
      Usuario.findByPk(userId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al verificar usuario')), 5000)
      )
    ]);

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
      statement_descriptor: `QFINDER ${planType.toUpperCase()}`,
      expires: false
    };

    // Crear preferencia con timeout
    const preference = await Promise.race([
      createPreference(preferenceData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout al crear preferencia')), TIMEOUT)
      )
    ]);
    
    logger.info({ userId, planType, preferenceId: preference.id }, 'Preferencia creada exitosamente');
    
    res.status(200).json({
      success: true,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preference_id: preference.id
    });
  } catch (error) {
    logger.error({
      error: error.message,
      userId: req.body?.userId,
      planType: req.body?.planType
    }, 'Error al crear preferencia de pago');
    
    const status = error.message.includes('Timeout') ? 504 : 500;
    res.status(status).json({ 
      success: false,
      error: error.message.includes('Timeout') ? 
        'Tiempo de espera agotado al crear la preferencia' : 
        'Error al crear preferencia de pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función para notificar errores críticos
function notifyCriticalError(error, context = {}) {
  const criticalError = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  logger.fatal(criticalError, '🚨 Error crítico en procesamiento de pagos');
  
  // Aquí podrías integrar con un servicio de monitoreo como Sentry
  // sentry.captureException(error, { extra: context });
}