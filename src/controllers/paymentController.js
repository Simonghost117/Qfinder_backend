import { models } from '../models/index.js';
const { Usuario, Subscription } = models;
import { SUBSCRIPTION_LIMITS } from '../config/subscriptions.js';
import dotenv from 'dotenv';
import { PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from 'mercadopago';

// Configuración de variables de entorno
dotenv.config();
const token = "TEST-358197303018633-060512-ccf1663185081e779360ba7d539ce364-390857873"
// Configuración robusta del cliente MercadoPago
const createMercadoPagoClient = () => {
  const accessToken = token || process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está definido en .env');
  }

  // Validación básica del token
  if (!accessToken.startsWith('TEST-') && !accessToken.startsWith('APP_USR-')) {
    throw new Error('Formato de token inválido. Debe comenzar con TEST- o APP_USR-');
  }

  return new MercadoPagoConfig({
    accessToken: accessToken, // Nota: camelCase
    options: {
      timeout: 15000,
      idempotencyKey: `mp-${Date.now()}`,
      integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID // Opcional
    }
  });
};

// Inicialización de clientes
const mercadoPagoConfig = createMercadoPagoClient();
const preApprovalPlanClient = new PreApprovalPlan(mercadoPagoConfig);
const preApprovalClient = new PreApproval(mercadoPagoConfig);

/**
 * Crea un plan de suscripción en MercadoPago
 */
export const createSubscriptionPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!PLANS_MERCADOPAGO[planType]) {
      return res.status(400).json({ 
        error: 'Tipo de plan no válido',
        availablePlans: Object.keys(PLANS_MERCADOPAGO)
      });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    const planData = {
      reason: plan.description,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        repetitions: 12,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: plan.amount,
        currency_id:plan.currency_id || "COP"
      },
      payment_methods_allowed: {
        payment_types: [
          { id: "credit_card" },
          { id: "debit_card" }
        ]
      },
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    const response = await preApprovalPlanClient.create({ body: planData });
    
    // Actualizamos el ID del plan en nuestra configuración
    PLANS_MERCADOPAGO[planType].id = response.id;
    
    res.status(201).json({
      success: true,
      id: response.id,
      ...plan
    });
  } catch (error) {
    console.error('Error creando plan:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Error al crear plan de suscripción',
      details: error.message
    });
  }
};

/**
 * Crea una suscripción para un usuario
 */
export const createUserSubscription = async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    // Validación de campos requeridos
    if (!userId || !planType) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos',
        missing_fields: {
          userId: !userId,
          planType: !planType
        }
      });
    }

    // Validación del tipo de plan
    if (!['plus', 'pro'].includes(planType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Tipo de plan inválido',
        validPlans: ['plus', 'pro']
      });
    }

    const plan = PLANS_MERCADOPAGO[planType];
    
    if (!plan || !plan.id) {
      return res.status(400).json({ 
        success: false,
        error: 'Plan no configurado correctamente'
      });
    }

    // Verificar existencia del usuario
    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar suscripciones existentes
    const existingSubscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });
    
    if (existingSubscription) {
      return res.status(400).json({ 
        success: false,
        error: 'Usuario ya tiene suscripción activa o pendiente',
        subscriptionId: existingSubscription.id_subscription
      });
    }

    // Datos para la suscripción en MercadoPago
    const subscriptionData = {
      preapproval_plan_id: plan.id,
      payer_email: user.correo_usuario,
      external_reference: `USER_${userId}`,
      reason: plan.description,
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    // Crear suscripción en MercadoPago
    const mpSubscription = await preApprovalClient.create({ body: subscriptionData });
    
    // Crear registro en la base de datos
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
      success: true,
      id: newSubscription.id_subscription,
      mercado_pago_id: mpSubscription.id,
      init_point: mpSubscription.init_point,
      status: mpSubscription.status
    });
  } catch (error) {
    console.error('Error al crear suscripción:', {
      message: error.message,
      status: error.status,
      stack: error.stack,
      response: error.response?.data || 'No hay datos de respuesta'
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Error al crear suscripción',
      details: error.message
    });
  }
};

/**
 * Obtiene el estado de la suscripción de un usuario
 */
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

    // Si no hay suscripción, devolver estado free
    if (!subscription) {
      return res.json({
        success: true,
        status: 'free',
        patient_limit: SUBSCRIPTION_LIMITS.free.pacientes,
        caregiver_limit: SUBSCRIPTION_LIMITS.free.cuidadores
      });
    }

    // Obtener estado actualizado de MercadoPago
    const mpSubscription = await preApprovalClient.get({ id: subscription.mercado_pago_id });
    const status = mpSubscription.status;

    // Actualizar estado si ha cambiado
    if (subscription.estado_suscripcion !== status) {
      await subscription.update({ estado_suscripcion: status });
      
      // Actualizar membresía del usuario si es necesario
      if (status === 'cancelled' || status === 'paused') {
        await Usuario.update(
          { membresia: 'free' },
          { where: { id_usuario: userId } }
        );
      }
    }

    res.json({
      success: true,
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
    console.error('Error obteniendo estado de suscripción:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estado de suscripción',
      details: error.message
    });
  }
};

/**
 * Cancela una suscripción activa
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Buscar suscripción activa o pendiente
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });

    if (!subscription) {
      return res.status(404).json({ 
        success: false,
        error: 'No hay suscripción activa o pendiente para este usuario'
      });
    }

    // Cancelar en MercadoPago
    await preApprovalClient.update({
      id: subscription.mercado_pago_id,
      body: { status: 'cancelled' }
    });

    // Actualizar en base de datos
    await subscription.update({
      estado_suscripcion: 'cancelled',
      fecha_cancelacion: new Date()
    });

    // Actualizar membresía del usuario
    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    res.json({ 
      success: true,
      message: 'Suscripción cancelada exitosamente',
      cancellation_date: new Date()
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al cancelar suscripción',
      details: error.message
    });
  }
};

/**
 * Maneja los webhooks de MercadoPago
 */
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
        const mpSubscription = await preApprovalClient.get({ id: data.id });
        const status = mpSubscription.status;

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
    res.status(500).json({ 
      success: false,
      error: 'Error procesando webhook',
      details: error.message
    });
  }
};

/**
 * Función interna para crear planes (usada en inicialización)
 */
export const createSubscriptionPlanInternal = async (planType) => {
  try {
    const plan = PLANS_MERCADOPAGO[planType];
    
    if (!plan) {
      throw new Error(`Tipo de plan ${planType} no válido`);
    }

    const planData = {
      reason: plan.description,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        repetitions: 12,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: plan.amount,
        currency_id: plan.currency_id || "COP"
      },
      payment_methods_allowed: {
        payment_types: [
          { id: "credit_card" },
          { id: "debit_card" }
        ]
      },
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    const response = await preApprovalPlanClient.create({ body: planData });
    
    if (!response || !response.id) {
      throw new Error('Respuesta inválida de MercadoPago');
    }

    PLANS_MERCADOPAGO[planType].id = response.id;
    console.log(`Plan ${planType} creado con ID: ${response.id}`);
    
    return response;
  } catch (error) {
    console.error(`Error creando plan ${planType}:`, {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Verifica la conexión con MercadoPago
 */
export const verifyMercadoPagoConnection = async (req, res) => {
  try {
    const testPlan = {
      reason: "Test Connection Plan",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 1,
        currency_id: plan.currency_id || "COP"
      }
    };

    const response = await preApprovalPlanClient.create({ body: testPlan });
    await preApprovalPlanClient.delete({ id: response.id });

    res.json({ 
      success: true,
      message: 'Conexión con MercadoPago verificada correctamente',
      planId: response.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en conexión con MercadoPago',
      errorDetails: {
        message: error.message,
        status: error.status,
        stack: error.stack
      },
      recommendations: [
        'Verifica MERCADOPAGO_ACCESS_TOKEN en .env',
        'Confirma que el token tenga permisos para suscripciones',
        'Prueba con un token de sandbox (TEST-) primero'
      ]
    });
  }
};