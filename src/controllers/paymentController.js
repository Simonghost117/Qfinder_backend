import mercadopago from 'mercadopago';
const { MercadoPagoConfig, PreapprovalPlan, Preapproval, Payment } = mercadopago;
import dotenv from 'dotenv';
import  {Usuario}  from '../models/index.js';
import Subscription from '../models/subscription.model.js';
import Paciente  from '../models/paciente.model.js';
import Colaborador from '../models/colaborador.model.js';
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import crypto from 'crypto';

dotenv.config();

// Configurar cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined
  }
});

const preapprovalPlan = new PreapprovalPlan(client);
const preapproval = new Preapproval(client);
const payment = new Payment(client);

// Función para verificar firma webhook
const verifySignature = (payload, signature) => {
  const hash = crypto.createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
                     .update(JSON.stringify(payload))
                     .digest('hex');
  return hash === signature;
};

export const createPlan = async (req, res) => {
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

    const result = await preapprovalPlan.create({ body: planData });
    
    PLANS_MERCADOPAGO[planType].id = result.id;
    
    res.status(201).json({
      id: result.id,
      ...plan
    });
  } catch (error) {
    console.error('Error creando plan:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.cause?.details || null
    });
  }
};

export const createUserSubscription = async (req, res) => {
  try {
    const { userId, planType, cardToken } = req.body;
    
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
      status: "authorized",
      external_reference: `USER_${userId}`,
      reason: plan.description,
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    const result = await preapproval.create({ body: subscriptionData });
    
    const newSubscription = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: result.id,
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
      mercado_pago_id: result.id,
      status: result.status,
      init_point: result.init_point
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.cause?.details || null
    });
  }
};

export const webhookHandler = async (req, res) => {
  try {
    const signature = req.headers['x-signature-sha256'];
    const payload = req.body;

    if (!verifySignature(payload, signature)) {
      console.warn('Firma de webhook inválida');
      return res.status(401).json({ error: 'Firma no válida' });
    }

    console.log("Webhook recibido:", JSON.stringify(payload, null, 2));
    
    const { type, data } = payload;
    let subscription;

    if (type === 'payment') {
      const paymentResult = await payment.get({ id: data.id });
      const paymentData = paymentResult;
      
      subscription = await Subscription.findOne({
        where: { mercado_pago_id: paymentData.external_reference }
      });

      if (paymentData.status === 'approved' && subscription) {
        await Subscription.update(
          { 
            estado_suscripcion: 'active',
            fecha_inicio: new Date(),
            fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            limite_pacientes: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].pacientes,
            limite_cuidadores: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].cuidadores
          },
          { where: { mercado_pago_id: paymentData.external_reference } }
        );
        
        await Usuario.update(
          { membresia: subscription.tipo_suscripcion },
          { where: { id_usuario: subscription.usuario_id } }
        );
      }
    } 
    else if (type === 'subscription') {
      subscription = await Subscription.findOne({
        where: { mercado_pago_id: data.id }
      });

      if (subscription) {
        const mpSubscription = await preapproval.get({ id: data.id });
        const status = mpSubscription.status;

        await Subscription.update(
          { estado_suscripcion: status },
          { where: { mercado_pago_id: data.id } }
        );

        switch (status) {
          case 'cancelled':
            await Usuario.update(
              { membresia: 'free' },
              { where: { id_usuario: subscription.usuario_id } }
            );
            break;
          case 'authorized':
            await Usuario.update(
              { membresia: subscription.tipo_suscripcion },
              { where: { id_usuario: subscription.usuario_id } }
            );
            
            await Subscription.update(
              {
                limite_pacientes: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].pacientes,
                limite_cuidadores: SUBSCRIPTION_LIMITS[subscription.tipo_suscripcion].cuidadores
              },
              { where: { id_subscription: subscription.id_subscription } }
            );
            break;
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.cause?.details || null
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
      return res.status(404).json({ 
        status: 'free',
        message: 'Sin suscripción activa',
        patient_limit: SUBSCRIPTION_LIMITS.free.pacientes,
        caregiver_limit: SUBSCRIPTION_LIMITS.free.cuidadores
      });
    }

    if (subscription.estado_suscripcion === 'pending') {
      const mpSubscription = await preapproval.get({ id: subscription.mercado_pago_id });
      const status = mpSubscription.status;
      
      await Subscription.update(
        { estado_suscripcion: status },
        { where: { id_subscription: subscription.id_subscription } }
      );
      
      if (status === 'authorized') {
        await Usuario.update(
          { membresia: subscription.tipo_suscripcion },
          { where: { id_usuario: userId } }
        );
        subscription.estado_suscripcion = status;
      }
    }

    const used_patients = await Paciente.count({ where: { usuario_id: userId } });
    
    let used_caregivers = 0;
    const pacientes = await Paciente.findAll({ 
      where: { usuario_id: userId },
      attributes: ['id_paciente']
    });
    
    for (const paciente of pacientes) {
      const count = await Colaborador.count({
        where: { id_paciente: paciente.id_paciente }
      });
      used_caregivers += count;
    }

    res.json({
      id: subscription.id_subscription,
      status: subscription.estado_suscripcion,
      type: subscription.tipo_suscripcion,
      start_date: subscription.fecha_inicio,
      renewal_date: subscription.fecha_renovacion,
      patient_limit: subscription.limite_pacientes,
      caregiver_limit: subscription.limite_cuidadores,
      used_patients,
      used_caregivers
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.cause?.details || null
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

    await preapproval.update({
      id: subscription.mercado_pago_id,
      body: { status: 'cancelled' }
    });

    await Subscription.update(
      { 
        estado_suscripcion: 'cancelled',
        fecha_cancelacion: new Date()
      },
      { where: { id_subscription: subscription.id_subscription } }
    );

    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    res.json({ 
      message: 'Suscripción cancelada',
      cancellation_date: new Date()
    });
  } catch (error) {
    console.error('Error cancelando:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.cause?.details || null
    });
  }
};