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

export const handleWebhook = async (req, res) => {
  try {
    // Validar firma del webhook
    const signature = req.headers['x-signature'];
    if (signature !== process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.warn('Unauthorized webhook attempt');
      return res.sendStatus(401);
    }

    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await getPayment(data.id);
      
      // Solo procesar si el pago está aprobado
      if (payment.status === 'approved') {
        await processApprovedPayment(payment);
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing webhook',
      details: error.message
    });
  }
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