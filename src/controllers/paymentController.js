import axios from 'axios';
import dotenv from 'dotenv';
import { models } from '../models/index.js';
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';

dotenv.config();

const { Usuario, Subscription } = models;
const MP_BASE_URL = 'https://api.mercadopago.com';

const MP_HEADERS = {
  Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

// 1. Crear plan de suscripción
const createSubscriptionPlanInternal = async (planType) => {
  try {
    const plan = PLANS_MERCADOPAGO[planType];
    if (!plan) throw new Error(`Plan ${planType} no definido`);

    const planData = {
      back_url: process.env.MERCADOPAGO_BACK_URL || "https://tudominio.com/return",
      reason: plan.description,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.amount,
        currency_id: 'USD',
        repetitions: 12,
        billing_day: 10,
        billing_day_proportional: true
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }]
      }
    };

    const res = await axios.post(`${MP_BASE_URL}/preapproval_plan`, planData, { headers: MP_HEADERS });

    if (!res.data.id) throw new Error('Respuesta inválida de MercadoPago');
    PLANS_MERCADOPAGO[planType].id = res.data.id;

    return res.data.id;
  } catch (err) {
    throw new Error(`Error creando plan ${planType}: ${err.response?.data?.message || err.message}`);
  }
};

// 2. Inicializar todos los planes
export const initializePlans = async () => {
  for (const [planType, config] of Object.entries(PLANS_MERCADOPAGO)) {
    if (!config.id) {
      await createSubscriptionPlanInternal(planType);
    }
  }
};

// 3. Crear suscripción
export const createUserSubscription = async (req, res) => {
  const { userId, planType } = req.body;
  const plan = PLANS_MERCADOPAGO[planType];
  if (!plan || !plan.id) return res.status(400).json({ error: 'Plan no válido o no inicializado' });

  const user = await Usuario.findByPk(userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const existing = await Subscription.findOne({
    where: { usuario_id: userId, estado_suscripcion: ['active', 'pending'] }
  });
  if (existing) return res.status(400).json({ error: 'Ya tiene suscripción activa o pendiente' });

  const subData = {
    preapproval_plan_id: plan.id,
    payer_email: user.correo_usuario,
    external_reference: `USER_${userId}_${Date.now()}`,
    back_url: process.env.MERCADOPAGO_BACK_URL,
    reason: plan.description
  };

  try {
    const response = await axios.post(`${MP_BASE_URL}/preapproval`, subData, { headers: MP_HEADERS });

    const sub = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: response.data.id,
      plan_id: plan.id,
      tipo_suscripcion: planType,
      estado_suscripcion: 'pending',
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: new Date(),
      fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });

    return res.status(201).json({
      success: true,
      subscriptionId: sub.id_subscription,
      initPoint: response.data.init_point,
      status: response.data.status
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Error creando suscripción',
      details: err.response?.data || err.message
    });
  }
};

// 6. Obtener estado de suscripción
export const getSubscriptionStatus = async (req, res) => {
  const { userId } = req.params;
  console.log(`\n🔍 Consultando estado para usuario ${userId}`);

  try {
    const sub = await Subscription.findOne({
      where: { usuario_id: userId },
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'correo_usuario', 'membresia']
      }]
    });

    if (!sub) {
      return res.json({
        status: 'free',
        limits: SUBSCRIPTION_LIMITS.free
      });
    }

    // Sincronizar con MercadoPago
    const mpSub = await mercadopago.preapproval.get(sub.mercado_pago_id);
    const mpStatus = mpSub.response?.status || sub.estado_suscripcion;

    if (sub.estado_suscripcion !== mpStatus) {
      await sub.update({ estado_suscripcion: mpStatus });
      
      if (mpStatus === 'cancelled' || mpStatus === 'paused') {
        await Usuario.update(
          { membresia: 'free' },
          { where: { id_usuario: userId } }
        );
      }
    }

    res.json({
      status: mpStatus,
      type: sub.tipo_suscripcion,
      startDate: sub.fecha_inicio,
      renewalDate: sub.fecha_renovacion,
      limits: {
        patients: sub.limite_pacientes,
        caregivers: sub.limite_cuidadores
      }
    });

  } catch (error) {
    console.error('❌ Error en getSubscriptionStatus:', error.message);
    res.status(500).json({
      error: 'Error al obtener estado',
      message: error.message
    });
  }
};

// 7. Cancelar suscripción
export const cancelSubscription = async (req, res) => {
  const { userId } = req.body;
  console.log(`\n🛑 Cancelando suscripción para usuario ${userId}`);

  try {
    const sub = await Subscription.findOne({
      where: { usuario_id: userId, estado_suscripcion: ['active', 'pending'] }
    });

    if (!sub) {
      throw new Error('No hay suscripción activa/pendiente');
    }

    await mercadopago.preapproval.update({
      id: sub.mercado_pago_id,
      status: 'cancelled'
    });

    await sub.update({
      estado_suscripcion: 'cancelled',
      fecha_cancelacion: new Date()
    });

    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    res.json({
      success: true,
      message: 'Suscripción cancelada',
      cancellationDate: new Date()
    });

  } catch (error) {
    console.error('❌ Error en cancelSubscription:', error.message);
    res.status(500).json({
      error: 'Error al cancelar suscripción',
      message: error.message
    });
  }
};

// 8. Webhook handler
export const webhookHandler = async (req, res) => {
  const eventId = req.headers['x-request-id'] || `webhook_${Date.now()}`;
  console.log(`\n🔄 Procesando webhook ${eventId}`);

  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      const paymentData = payment.response;
      
      const externalRef = paymentData.external_reference;
      if (!externalRef?.startsWith('USER_')) return res.sendStatus(200);
      
      const userId = externalRef.split('_')[1];
      const sub = await Subscription.findOne({
        where: { mercado_pago_id: externalRef }
      });

      if (paymentData.status === 'approved' && sub) {
        await sub.update({
          estado_suscripcion: 'active',
          fecha_inicio: new Date(),
          fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
        });
        
        await Usuario.update(
          { membresia: sub.tipo_suscripcion },
          { where: { id_usuario: sub.usuario_id } }
        );
      }
    } 
    else if (type === 'subscription') {
      const sub = await Subscription.findOne({
        where: { mercado_pago_id: data.id }
      });

      if (sub) {
        const mpSub = await mercadopago.preapproval.get(data.id);
        const status = mpSub.response.status;
        await sub.update({ estado_suscripcion: status });

        if (status === 'cancelled' || status === 'paused') {
          await Usuario.update(
            { membresia: 'free' },
            { where: { id_usuario: sub.usuario_id } }
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(`❌ Error en webhook ${eventId}:`, error.message);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
};