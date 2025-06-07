import { MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';
import crypto, { timingSafeEqual } from 'crypto';
import { models } from '../models/index.js';
const { Usuario, Subscription, Paciente, Colaborador, Plan } = models;
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';

dotenv.config();

// Configuración SDK de MercadoPago (v2.x)
const mercadopago = new MercadoPagoConfig({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Firma HMAC-SHA256 segura
const verifySignature = (payload, signature) => {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  const received = Buffer.from(signature);
  const expected = Buffer.from(hash);
  return received.length === expected.length && timingSafeEqual(received, expected);
};

// Crear plan (persistido en BD)
export const createPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    if (!Object.keys(PLANS_MERCADOPAGO).includes(planType)) {
      return res.status(400).json({ error: 'Tipo de plan no válido' });
    }
    const cfg = PLANS_MERCADOPAGO[planType];
    const planData = {
      description: cfg.description,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        repetitions: 12,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: cfg.amount,
        currency_id: 'USD'
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }]
      },
      back_url: process.env.MERCADOPAGO_BACK_URL
    };
    const mpPlan = await mercadopago.preapproval_plan.create(planData);
    const mpId = mpPlan.response.id;

    // Persistimos el plan
    const plan = await Plan.create({
      name: planType,
      description: cfg.description,
      amount: cfg.amount,
      mp_plan_id: mpId
    });

    return res.status(201).json({
      planId: plan.id,
      mpPlanId: mpId,
      description: cfg.description,
      amount: cfg.amount
    });
  } catch (err) {
    console.error('Error creando plan:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Crear suscripción de usuario
export const createUserSubscription = async (req, res) => {
  try {
    const { userId, planId, cardToken } = req.body;
    if (!userId || !planId || !cardToken) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado o no creado' });
    }

    const user = await Usuario.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existing = await Subscription.findOne({ where: { usuario_id: userId, estado_suscripcion: 'active' } });
    if (existing) return res.status(400).json({ error: 'Suscripción ya activa' });

    // Creamos la suscripción
    const mpSubscription = await mercadopago.preapproval.create({
      preapproval_plan_id: plan.mp_plan_id,
      payer_email: user.correo_usuario,
      card_token_id: cardToken,
      external_reference: '', // asignamos después
      reason: plan.description
    });

    const extRef = `SUB_${mpSubscription.response.id}`;

    // Actualizar external_reference
    await mercadopago.preapproval.update({
      id: mpSubscription.response.id,
      external_reference: extRef
    });

    const newSub = await Subscription.create({
      usuario_id: userId,
      plan_id: planId,
      mercado_pago_id: mpSubscription.response.id,
      external_reference: extRef,
      tipo_suscripcion: plan.name,
      estado_suscripcion: 'pending',
      limite_pacientes: SUBSCRIPTION_LIMITS[plan.name].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[plan.name].cuidadores,
      fecha_inicio: new Date(),
      fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });

    return res.status(201).json({
      id: newSub.id_subscription,
      mercado_pago_id: mpSubscription.response.id,
      external_reference: extRef,
      init_point: mpSubscription.response.init_point
    });
  } catch (err) {
    console.error('Error creating subscription:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Webhook handler
export const webhookHandler = async (req, res) => {
  try {
    const signature = req.headers['x-signature-sha256'];
    const payload = req.body;

    if (!verifySignature(payload, signature)) {
      console.warn('Firma inválida');
      return res.status(401).json({ error: 'Firma no válida' });
    }

    const { type, data } = payload;
    let subscription = null;

    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      const pd = payment.response;
      subscription = await Subscription.findOne({ where: { external_reference: pd.external_reference } });

      if (pd.status === 'approved' && subscription) {
        await Subscription.update({
          estado_suscripcion: 'active',
          fecha_inicio: new Date(),
          fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          limite_pacientes: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].pacientes,
          limite_cuidadores: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].cuidadores
        }, { where: { external_reference: pd.external_reference } });

        await Usuario.update({ membresia: subscription.tipo_suscripcion }, { where: { id_usuario: subscription.usuario_id } });
      }
    } else if (type === 'subscription') {
      subscription = await Subscription.findOne({ where: { mercado_pago_id: data.id } });
      if (subscription) {
        const mpSub = await mercadopago.preapproval.get(data.id);
        const st = mpSub.response.status;

        await Subscription.update({ estado_suscripcion: st }, { where: { mercado_pago_id: data.id } });
        if (st === 'cancelled') {
          await Usuario.update({ membresia: 'free' }, { where: { id_usuario: subscription.usuario_id } });
        } else if (st === 'authorized') {
          await Subscription.update({
            limite_pacientes: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].pacientes,
            limite_cuidadores: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].cuidadores
          }, { where: { id_subscription: subscription.id_subscription } });

          await Usuario.update({ membresia: subscription.tipo_suscripcion }, { where: { id_usuario: subscription.usuario_id } });
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};

// Obtener estado y límites de suscripción
export const getSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const sub = await Subscription.findOne({
      where: { usuario_id: userId },
      include: [{ model: Usuario, attributes: ['id_usuario', 'nombre_usuario', 'correo_usuario', 'membresia'] }]
    });

    if (!sub) {
      return res.json({
        status: 'free',
        patient_limit: SUBSCRIPTION_LIMITS.free.pacientes,
        caregiver_limit: SUBSCRIPTION_LIMITS.free.cuidadores,
        used_patients: 0,
        used_caregivers: 0
      });
    }

    if (sub.estado_suscripcion === 'pending') {
      const mpS = await mercadopago.preapproval.get(sub.mercado_pago_id);
      if (mpS.response.status === 'authorized') {
        await Subscription.update({ estado_suscripcion: 'authorized' }, { where: { id_subscription: sub.id_subscription } });
        await Usuario.update({ membresia: sub.tipo_suscripcion }, { where: { id_usuario: userId } });
        sub.estado_suscripcion = 'authorized';
      }
    }

    const used_patients = await Paciente.count({ where: { usuario_id: userId } });
    const patientIds = (await Paciente.findAll({ where: { usuario_id: userId }, attributes: ['id_paciente'] })).map(p => p.id_paciente);

    const used_caregivers = patientIds.length > 0
      ? await Colaborador.count({ where: { id_paciente: patientIds } })
      : 0;

    return res.json({
      id: sub.id_subscription,
      status: sub.estado_suscripcion,
      type: sub.tipo_suscripcion,
      start_date: sub.fecha_inicio,
      renewal_date: sub.fecha_renovacion,
      patient_limit: sub.limite_pacientes,
      caregiver_limit: sub.limite_cuidadores,
      used_patients,
      used_caregivers
    });
  } catch (err) {
    console.error('Error obteniendo estado:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};

// Cancelar suscripción activa
export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    const sub = await Subscription.findOne({ where: { usuario_id: userId, estado_suscripcion: 'active' } });
    if (!sub) return res.status(404).json({ error: 'No hay suscripción activa' });

    await mercadopago.preapproval.update({ id: sub.mercado_pago_id, status: 'cancelled' });
    await Subscription.update({ estado_suscripcion: 'cancelled', fecha_cancelacion: new Date() }, { where: { id_subscription: sub.id_subscription } });
    await Usuario.update({ membresia: 'free' }, { where: { id_usuario: userId } });

    return res.json({ message: 'Suscripción cancelada', cancellation_date: new Date() });
  } catch (err) {
    console.error('Error cancelando:', err);
    return res.status(500).json({ error: err.message });
  }
};
