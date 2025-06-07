import mercadopago from 'mercadopago';
import { models } from '../models/index.js';
const { Usuario, Subscription, Paciente, Colaborador, Plan } = models;
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import dotenv from 'dotenv';

// Extraer clases necesarias del módulo CommonJS
const { MercadoPagoConfig, PreapprovalPlan, Preapproval } = mercadopago;

dotenv.config();

// Configuración de MercadoPago (v2)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

// Crear instancias de los servicios
const preapprovalPlan = new PreapprovalPlan(client);
const preapproval = new Preapproval(client);

export const createSubscriptionPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!PLANS_MERCADOPAGO[planType]) {
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

    // Crear plan usando la nueva API
    const mpPlan = await preapprovalPlan.create({ body: planData });
    
    // Actualizar el plan con el ID generado
    PLANS_MERCADOPAGO[planType].id = mpPlan.id;
    
    res.status(201).json({
      id: mpPlan.id,
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
    const { userId, planType, cardToken } = req.body;
    
    if (!userId || !planType || !cardToken) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!['plus', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Tipo de plan inválido' });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    
    if (!plan || !plan.id) {
      return res.status(400).json({ error: 'Plan no configurado' });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existingSubscription = await Subscription.findOne({
      where: { usuario_id: userId, estado_suscripcion: 'active' }
    });
    
    if (existingSubscription) {
      return res.status(400).json({ error: 'Usuario ya tiene suscripción activa' });
    }

    const subscriptionData = {
      preapproval_plan_id: plan.id,
      payer_email: user.correo_usuario,
      card_token_id: cardToken,
      external_reference: `USER_${userId}`,
      reason: plan.description
    };

    // Crear suscripción usando la nueva API
    const mpSubscription = await preapproval.create({ body: subscriptionData });
    
    const newSubscription = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: mpSubscription.id,
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
      mercado_pago_id: mpSubscription.id,
      init_point: mpSubscription.init_point,
      status: mpSubscription.status
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.cause ? error.cause : null
    });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const subscription = await Subscription.findOne({
      where: { usuario_id: userId },
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'nombre_usuario', 'correo_usuario', 'membresia']
      }]
    });

    if (!subscription) {
      return res.json({
        status: 'free',
        patient_limit: SUBSCRIPTION_LIMITS.free.pacientes,
        caregiver_limit: SUBSCRIPTION_LIMITS.free.cuidadores
      });
    }

    // Verificar estado actual en MercadoPago usando la nueva API
    const mpSubscription = await preapproval.get({ id: subscription.mercado_pago_id });
    const status = mpSubscription.status;

    // Actualizar estado si es necesario
    if (subscription.estado_suscripcion !== status) {
      await subscription.update({ estado_suscripcion: status });
      
      if (status === 'cancelled') {
        await Usuario.update(
          { membresia: 'free' },
          { where: { id_usuario: userId } }
        );
      }
    }

    res.json({
      id: subscription.id_subscription,
      status: subscription.estado_suscripcion,
      type: subscription.tipo_suscripcion,
      start_date: subscription.fecha_inicio,
      renewal_date: subscription.fecha_renovacion,
      patient_limit: subscription.limite_pacientes,
      caregiver_limit: subscription.limite_cuidadores
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const subscription = await Subscription.findOne({
      where: { usuario_id: userId, estado_suscripcion: 'active' }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No hay suscripción activa' });
    }

    // Cancelar suscripción usando la nueva API
    await preapproval.update({
      id: subscription.mercado_pago_id,
      body: { status: 'cancelled' }
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
    res.status(500).json({ 
      error: error.message,
      details: error.cause ? error.cause : null
    });
  }
};