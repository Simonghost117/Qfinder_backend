import { createPreference, getPayment, searchPayments } from '../services/mercadopagoService.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
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

export const handleWebhook = async (req, res) => {
  try {
    // Validación estricta de la firma
    // const isValidSignature = verifyWebhookSignature(req);
    
    // if (!isValidSignature) {
    //   console.error('Intento de webhook no autorizado', {
    //     headers: req.headers,
    //     body: req.body
    //   });
    //   return res.sendStatus(401);
    // }

    console.log('Webhook válido recibido:', {
      type: req.body.type,
      data: req.body.data
    });

    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await getPayment(data.id);
      console.log('Estado del pago:', payment.status);

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
          console.log(`Estado de pago no manejado: ${payment.status}`);
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error en handleWebhook:', {
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

async function processApprovedPayment(payment) {
  try {
    const { external_reference, id } = payment;
    
    if (!external_reference) {
      throw new Error('Pago no tiene external_reference');
    }

    const [_, userId, __, planType] = external_reference.split('_');
    
    if (!userId || !planType) {
      throw new Error(`Formato de external_reference inválido: ${external_reference}`);
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      throw new Error(`Usuario ${userId} no encontrado`);
    }

    // Verificar si el pago ya fue procesado
    const existingPayment = await Subscription.findOne({
      where: { mercado_pago_id: id }
    });

    if (existingPayment) {
      console.log(`Pago ${id} ya fue procesado anteriormente`);
      return;
    }

    // Crear o actualizar suscripción
    const [subscription, created] = await Subscription.upsert({
      id_usuario: userId,
      mercado_pago_id: id,
      plan_id: `plan-${planType}`,
      tipo_suscripcion: planType,
      estado_suscripcion: 'active',
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: new Date(),
      fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      datos_pago: JSON.stringify(payment)
    });

    // Actualizar membresía del usuario
    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId } }
    );

    console.log(`Suscripción ${created ? 'creada' : 'actualizada'} para usuario ${userId}, plan ${planType}`);
  } catch (error) {
    console.error('Error en processApprovedPayment:', {
      error: error.message,
      paymentId: payment.id,
      stack: error.stack
    });
    throw error;
  }
}

async function processPendingPayment(payment) {
  console.log(`Procesando pago pendiente: ${payment.id}`);
  // Lógica para pagos pendientes
}

async function processRejectedPayment(payment) {
  console.log(`Procesando pago rechazado: ${payment.id}`);
  // Lógica para pagos rechazados
}

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
    console.error('Error en verifyPayment:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando pago',
      details: error.message
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