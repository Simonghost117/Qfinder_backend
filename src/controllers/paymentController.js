import mercadopago from 'mercadopago';

const { MercadoPagoConfig, PaymentMethods } = mercadopago;

export async function configureMercadoPago() {
  try {
    // 1. Validar token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token inválido');
    }

    // 2. Configurar cliente
    const client = new MercadoPagoConfig({
      accessToken: mpToken,
      options: { 
        integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined 
      }
    });

    // 3. Probar conexión
    const paymentMethods = new PaymentMethods(client);
    const methods = await paymentMethods.list();
    
    console.log("✅ MercadoPago listo. Métodos:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Error MP:", {
      message: error.message,
      code: error.status || 500,
      stack: error.stack
    });
    return false;
  }
}
export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No hay suscripción activa o pendiente' });
    }

    await mercadopago.preapproval.update({
      id: subscription.mercado_pago_id,
      status: 'cancelled'
    });

    await subscription.update({
      estado_suscripcion: 'cancelled',
      fecha_cancelacion: new Date()
    });

    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    res.json({ 
      message: 'Suscripción cancelada',
      cancellation_date: new Date()
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    
    let errorMessage = 'Error interno del servidor';
    if (error.response && error.response.body) {
      errorMessage = error.response.body.message || JSON.stringify(error.response.body);
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message
    });
  }
};
export const createSubscriptionPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!PLANS_MERCADOPAGO[planType].id) {
      return res.status(400).json({ error: 'Tipo de plan no válido' });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    
    const planData = {
      description: plan.description,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        repetitions: 12,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: plan.amount,
        currency_id: "USD"
      },
      payment_methods_allowed: {
        payment_types: [{ id: "credit_card" }, { id: "debit_card" }]
      },
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    const mpPlan = await mercadopago.preapproval_plan.create(planData);
    
    PLANS_MERCADOPAGO[planType].id = mpPlan.response.id;
    
    res.status(201).json({
      id: mpPlan.response.id,
      ...plan
    });
  } catch (error) {
    console.error('Error creando plan:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.cause ? error.cause : null
    });
  }
};
export const createUserSubscription = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    if (!userId || !planType) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        missing_fields: {
          userId: !userId,
          planType: !planType
        }
      });
    }

    if (!['plus', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Tipo de plan inválido' });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    
    if (!plan || !plan.id) {
      return res.status(400).json({ error: 'Plan no configurado' });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const existingSubscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });
    
    if (existingSubscription) {
      return res.status(400).json({ 
        error: 'Usuario ya tiene suscripción activa o pendiente',
        subscriptionId: existingSubscription.id_subscription
      });
    }

    const subscriptionData = {
      preapproval_plan_id: plan.id,
      payer_email: user.correo_usuario,
      external_reference: `USER_${userId}`,
      reason: plan.description,
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    const mpSubscription = await mercadopago.preapproval.create(subscriptionData);
    
    const newSubscription = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: mpSubscription.response.id,
      plan_id: plan.id,
      tipo_suscripcion: planType,
      estado_suscripcion: 'pending',
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: new Date(),
      fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });

    res.status(201).json({
      id: newSubscription.id_subscription,
      mercado_pago_id: mpSubscription.response.id,
      init_point: mpSubscription.response.init_point,
      status: mpSubscription.response.status
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    
    let errorMessage = 'Error interno del servidor';
    let errorDetails = null;
    
    if (error.response && error.response.body) {
      errorDetails = error.response.body;
      if (error.response.body.message) {
        errorMessage = error.response.body.message;
      } else if (Array.isArray(error.response.body.cause)) {
        errorMessage = error.response.body.cause[0].description;
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
};