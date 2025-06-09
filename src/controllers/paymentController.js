import { createPreference, getPayment } from '../services/mercadopagoService.js';
import { PLANS_MERCADOPAGO, SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import { models } from '../models/index.js';
const { Usuario, Subscription } = models;

export const createCheckoutProPreference = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    // Validaciones
    if (!userId || !planType) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: userId and planType'
      });
    }

    if (!PLANS_MERCADOPAGO[planType]) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plan type',
        availablePlans: Object.keys(PLANS_MERCADOPAGO)
      });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found'
      });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    
    const preferenceData = {
      items: [
        {
          id: `sub-${planType}`,
          title: `Suscripción ${planType.toUpperCase()}`,
          description: plan.description,
          quantity: 1,
          unit_price: plan.amount,
          currency_id: plan.currency_id
        }
      ],
      payer: {
        email: user.correo_usuario,
        name: user.nombre_usuario,
        identification: {
          type: "CC",
          number: user.documento_usuario || "12345678"
        }
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 1,
        default_installments: 1
      },
      external_reference: `USER_${userId}_PLAN_${planType}`,
      notification_url: `${process.env.API_BASE_URL}/api/payments/webhook`,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/subscription/success?user_id=${userId}`,
        failure: `${process.env.FRONTEND_URL}/subscription/failure?user_id=${userId}`,
        pending: `${process.env.FRONTEND_URL}/subscription/pending?user_id=${userId}`
      },
      auto_return: "approved",
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
    console.error('Error in createCheckoutProPreference:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creating payment preference',
      details: error.message
    });
  }
};

// ... (imports anteriores se mantienen igual)

export const handleWebhook = async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    // Validación opcional en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Skipping signature validation in development');
    } else {
      const signature = req.headers['x-signature'];
      if (signature !== process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        console.warn('Unauthorized webhook attempt. Signature:', signature);
        return res.sendStatus(401);
      }
    }

    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await getPayment(data.id);
      console.log(`Payment status: ${payment.status}`);
      
      if (payment.status === 'approved') {
        await processApprovedPayment(payment);
      } else {
        console.log(`Payment not approved. Status: ${payment.status}`);
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook handler:', JSON.stringify({
      error: error.message,
      stack: error.stack,
      body: req.body
    }, null, 2));
    res.status(500).json({ 
      success: false,
      error: 'Error processing webhook',
      details: error.message
    });
  }
};

async function processApprovedPayment(payment) {
  try {
    const externalRef = payment.external_reference;
    console.log('Processing payment with external_ref:', externalRef);
    
    if (!externalRef) {
      throw new Error('Missing external_reference in payment');
    }

    const refParts = externalRef.split('_');
    if (refParts.length < 4) {
      throw new Error(`Invalid external_reference format: ${externalRef}`);
    }

    const userId = refParts[1];
    const planType = refParts[3];

    // Verificar si el usuario existe
    const user = await Usuario.findByPk(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Verificar si el plan es válido
    if (!PLANS_MERCADOPAGO[planType]) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Resto de la lógica de suscripción...
    const existingSub = await Subscription.findOne({
      where: { id_usuario: userId, estado_suscripcion: 'active' }
    });
    
    if (existingSub) {
      console.log(`User ${userId} already has active subscription`);
      return;
    }

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

    await Usuario.update(
      { membresia: planType },
      { where: { id_usuario: userId } }
    );
    
    console.log(`Subscription created successfully for user ${userId}, plan ${planType}`);
  } catch (error) {
    console.error('Error in processApprovedPayment:', JSON.stringify({
      error: error.message,
      paymentId: payment.id,
      stack: error.stack
    }, null, 2));
    throw error;
  }
}