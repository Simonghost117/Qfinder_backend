import mercadopago from 'mercadopago';
import { models } from '../models/index.js';
const { Usuario, Subscription } = models;
import { SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import dotenv from 'dotenv';
import { PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import { MercadoPagoConfig } from 'mercadopago';
dotenv.config();

const mercadopago = new MercadoPagoConfig({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

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

    const mpSubscription = await mercadopago.preapproval.get(subscription.mercado_pago_id);
    const status = mpSubscription.response.status;

    if (subscription.estado_suscripcion !== status) {
      await subscription.update({ estado_suscripcion: status });
      
      if (status === 'cancelled' || status === 'paused') {
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
      caregiver_limit: subscription.limite_cuidadores,
      used_patients: subscription.pacientes_usados || 0,
      used_caregivers: subscription.cuidadores_usados || 0
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

export const webhookHandler = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      const paymentData = payment.response;
      
      // Buscar por external_reference (formato: USER_123)
      const externalReference = paymentData.external_reference;
      if (!externalReference || !externalReference.startsWith('USER_')) {
        return res.sendStatus(200);
      }
      
      const userId = externalReference.split('_')[1];
      const subscription = await Subscription.findOne({
        where: { mercado_pago_id: paymentData.external_reference }
      });

      if (paymentData.status === 'approved' && subscription) {
        await subscription.update({
          estado_suscripcion: 'active',
          fecha_inicio: new Date(),
          fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
        });
        
        await Usuario.update(
          { membresia: subscription.tipo_suscripcion },
          { where: { id_usuario: subscription.usuario_id } }
        );
      }
    } 
    else if (type === 'subscription') {
      const subscription = await Subscription.findOne({
        where: { mercado_pago_id: data.id }
      });

      if (subscription) {
        const mpSubscription = await mercadopago.preapproval.get(data.id);
        const status = mpSubscription.response.status;

        await subscription.update({ estado_suscripcion: status });

        if (status === 'cancelled' || status === 'paused') {
          await Usuario.update(
            { membresia: 'free' },
            { where: { id_usuario: subscription.usuario_id } }
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: error.message });
  }
};
// Función interna para crear planes
const createSubscriptionPlanInternal = async (planType) => {
  try {
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
    console.log(`Plan ${planType} creado con ID: ${mpPlan.response.id}`);
  } catch (error) {
    console.error(`Error creando plan ${planType}:`, error);
    throw new Error(`Error creando plan: ${error.message}`);
  }
};