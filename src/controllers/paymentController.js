import mercadopago from 'mercadopago';
import { models } from '../models/index.js';
const { Usuario, Subscription } = models;
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuración inicial de MercadoPago
console.log("🔧 Configurando MercadoPago...");
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
});

// Verificar que la configuración se aplicó correctamente
console.log("✅ MercadoPago configurado:", {
  sandbox: mercadopago.configurations.sandbox,
  access_token: mercadopago.configurations.getAccessToken() ? "****" + mercadopago.configurations.getAccessToken().slice(-4) : "NO CONFIGURADO"
});

// 2. Función interna para crear planes


// 3. Inicialización de Planes
export const initializePlans = async () => {
  console.log("\n⚙️ Iniciando inicialización de planes...");
  try {
    let allPlansCreated = true;
    
    for (const planType in PLANS_MERCADOPAGO) {
      try {
        if (!PLANS_MERCADOPAGO[planType].id) {
          console.log(`🔄 Procesando plan: ${planType}`);
          await createSubscriptionPlanInternal(planType);
          console.log(`✔ Plan ${planType} inicializado correctamente`);
        } else {
          console.log(`ℹ️ Plan ${planType} ya configurado (ID: ${PLANS_MERCADOPAGO[planType].id})`);
        }
      } catch (error) {
        console.error(`❌ Falló la inicialización del plan ${planType}`);
        allPlansCreated = false;
      }
    }

    if (!allPlansCreated) {
      throw new Error("Algunos planes no se inicializaron correctamente");
    }

    console.log("✅ Todos los planes inicializados correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error en initializePlans:", error.message);
    return false;
  }
};

// 4. Crear Suscripción de Usuario
export const createUserSubscription = async (req, res) => {
  const transactionId = `sub_${Date.now()}`;
  console.log(`\n📝 [${transactionId}] Nueva solicitud de suscripción`);
  
  try {
    const { userId, planType } = req.body;
    
    // Validaciones básicas
    if (!userId || !planType) {
      console.error(`❌ [${transactionId}] Campos faltantes`);
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        details: {
          userId: !userId ? "Falta userId" : null,
          planType: !planType ? "Falta planType" : null
        },
        transactionId
      });
    }

    // Validar tipo de plan
    if (!['plus', 'pro'].includes(planType)) {
      console.error(`❌ [${transactionId}] Plan no válido: ${planType}`);
      return res.status(400).json({ 
        error: 'Tipo de plan inválido',
        allowed_plans: ['plus', 'pro'],
        transactionId
      });
    }

    // Verificar plan configurado
    const plan = PLANS_MERCADOPAGO[planType];
    if (!plan?.id) {
      console.error(`❌ [${transactionId}] Plan no configurado`);
      return res.status(500).json({ 
        error: 'Plan no configurado en el sistema',
        transactionId
      });
    }

    // Buscar usuario
    console.log(`🔍 [${transactionId}] Buscando usuario ${userId}...`);
    const user = await Usuario.findByPk(userId);
    if (!user) {
      console.error(`❌ [${transactionId}] Usuario no encontrado`);
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        transactionId
      });
    }

    // Verificar suscripciones existentes
    console.log(`🔍 [${transactionId}] Verificando suscripciones activas...`);
    const existingSubscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });
    
    if (existingSubscription) {
      console.error(`❌ [${transactionId}] Usuario ya tiene suscripción`);
      return res.status(400).json({ 
        error: 'Usuario ya tiene suscripción activa o pendiente',
        currentStatus: existingSubscription.estado_suscripcion,
        transactionId
      });
    }

    // Crear suscripción en MercadoPago
    console.log(`🛠 [${transactionId}] Creando suscripción en MercadoPago...`);
    const subscriptionData = {
      preapproval_plan_id: plan.id,
      payer_email: user.correo_usuario,
      external_reference: `USER_${userId}_${transactionId}`,
      reason: plan.description,
      back_url: process.env.MERCADOPAGO_BACK_URL || "https://tudominio.com/return"
    };

    const mpSubscription = await mercadopago.preapproval.create(subscriptionData);
    
    if (!mpSubscription?.response?.id) {
      throw new Error("No se recibió ID de suscripción de MercadoPago");
    }

    // Guardar en base de datos
    console.log(`💾 [${transactionId}] Guardando suscripción en DB...`);
    const newSubscription = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: mpSubscription.response.id,
      plan_id: plan.id,
      tipo_suscripcion: planType,
      estado_suscripcion: 'pending',
      limite_pacientes: SUBSCRIPTION_LIMITS[planType].pacientes,
      limite_cuidadores: SUBSCRIPTION_LIMITS[planType].cuidadores,
      fecha_inicio: new Date(),
      fecha_renovacion: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      transaction_id: transactionId
    });

    console.log(`✅ [${transactionId}] Suscripción creada exitosamente`);
    
    res.status(201).json({
      success: true,
      subscriptionId: newSubscription.id_subscription,
      mercadoPagoId: mpSubscription.response.id,
      initPoint: mpSubscription.response.init_point,
      status: mpSubscription.response.status,
      transactionId,
      planDetails: {
        type: planType,
        description: plan.description,
        amount: plan.amount,
        limits: SUBSCRIPTION_LIMITS[planType]
      }
    });

  } catch (error) {
    console.error(`❌ [${transactionId}] Error en createUserSubscription:`, error.message);
    
    const errorData = {
      error: 'Error al procesar la suscripción',
      message: error.message,
      transactionId
    };

    if (error.response?.body) {
      console.error(`🔍 [${transactionId}] Error de MercadoPago:`, error.response.body);
      errorData.mpDetails = error.response.body;
    }

    res.status(500).json(errorData);
  }
};

// 5. Obtener Estado de Suscripción
export const getSubscriptionStatus = async (req, res) => {
  const { userId } = req.params;
  const transactionId = `status_${Date.now()}`;

  console.log(`\n🔍 [${transactionId}] Consultando estado para usuario ${userId}`);

  try {
    // Buscar suscripción en base de datos
    const subscription = await Subscription.findOne({
      where: { usuario_id: userId },
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'correo_usuario', 'membresia']
      }]
    });

    // Si no hay suscripción
    if (!subscription) {
      console.log(`ℹ️ [${transactionId}] Usuario sin suscripción activa`);
      return res.json({
        status: 'free',
        limits: SUBSCRIPTION_LIMITS.free,
        transactionId
      });
    }

    // Sincronizar con MercadoPago
    console.log(`🔄 [${transactionId}] Sincronizando estado con MercadoPago...`);
    const mpSubscription = await mercadopago.preapproval.get(subscription.mercado_pago_id);
    const mpStatus = mpSubscription.response?.status || subscription.estado_suscripcion;

    // Actualizar si cambió el estado
    if (subscription.estado_suscripcion !== mpStatus) {
      console.log(`🔄 [${transactionId}] Actualizando estado de ${subscription.estado_suscripcion} a ${mpStatus}`);
      await subscription.update({ estado_suscripcion: mpStatus });
      
      // Actualizar membresía si fue cancelada
      if (mpStatus === 'cancelled' || mpStatus === 'paused') {
        await Usuario.update(
          { membresia: 'free' },
          { where: { id_usuario: userId } }
        );
      }
    }

    res.json({
      status: mpStatus,
      type: subscription.tipo_suscripcion,
      startDate: subscription.fecha_inicio,
      renewalDate: subscription.fecha_renovacion,
      limits: {
        patients: subscription.limite_pacientes,
        caregivers: subscription.limite_cuidadores
      },
      transactionId
    });

  } catch (error) {
    console.error(`❌ [${transactionId}] Error obteniendo estado:`, error.message);
    res.status(500).json({
      error: 'Error al obtener estado',
      message: error.message,
      transactionId
    });
  }
};

// 6. Cancelar Suscripción
export const cancelSubscription = async (req, res) => {
  const { userId } = req.body;
  const transactionId = `cancel_${Date.now()}`;

  console.log(`\n🛑 [${transactionId}] Solicitud de cancelación para usuario ${userId}`);

  try {
    // Buscar suscripción activa
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });

    if (!subscription) {
      console.error(`❌ [${transactionId}] No hay suscripción activa/pendiente`);
      return res.status(404).json({ 
        error: 'No hay suscripción activa o pendiente',
        transactionId
      });
    }

    // Cancelar en MercadoPago
    console.log(`🛑 [${transactionId}] Cancelando en MercadoPago...`);
    await mercadopago.preapproval.update({
      id: subscription.mercado_pago_id,
      status: 'cancelled'
    });

    // Actualizar en base de datos
    console.log(`💾 [${transactionId}] Actualizando estado en DB...`);
    await subscription.update({
      estado_suscripcion: 'cancelled',
      fecha_cancelacion: new Date()
    });

    // Actualizar membresía del usuario
    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    console.log(`✅ [${transactionId}] Suscripción cancelada exitosamente`);
    
    res.json({ 
      success: true,
      message: 'Suscripción cancelada',
      cancellationDate: new Date(),
      transactionId
    });

  } catch (error) {
    console.error(`❌ [${transactionId}] Error cancelando suscripción:`, error.message);
    
    res.status(500).json({
      error: 'Error al cancelar suscripción',
      message: error.message,
      transactionId
    });
  }
};
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
    return mpPlan.response.id;
  } catch (error) {
    console.error(`Error creando plan ${planType}:`, error);
    throw error;
  }
};

// Función exportada para crear planes
export const createSubscriptionPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!PLANS_MERCADOPAGO[planType]) {
      return res.status(400).json({ error: 'Tipo de plan no válido' });
    }

    if (!PLANS_MERCADOPAGO[planType].id) {
      await createSubscriptionPlanInternal(planType);
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
      details: error.response?.body || null
    });
  }
};
// 7. Webhook de MercadoPago
export const webhookHandler = async (req, res) => {
  const eventId = req.headers['x-request-id'] || `webhook_${Date.now()}`;
  const eventType = req.body?.type;

  console.log(`\n🔄 [${eventId}] Nuevo evento de webhook: ${eventType}`);

  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      const paymentData = payment.response;
      
      const externalRef = paymentData.external_reference;
      if (!externalRef?.startsWith('USER_')) {
        console.log(`ℹ️ [${eventId}] External reference no válida: ${externalRef}`);
        return res.sendStatus(200);
      }
      
      const userId = externalRef.split('_')[1];
      console.log(`🔍 [${eventId}] Procesando pago para usuario ${userId}`);

      const subscription = await Subscription.findOne({
        where: { mercado_pago_id: paymentData.external_reference }
      });

      if (paymentData.status === 'approved' && subscription) {
        console.log(`✅ [${eventId}] Pago aprobado, actualizando suscripción`);
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
      console.log(`🔍 [${eventId}] Procesando actualización de suscripción`);
      const subscription = await Subscription.findOne({
        where: { mercado_pago_id: data.id }
      });

      if (subscription) {
        const mpSubscription = await mercadopago.preapproval.get(data.id);
        const status = mpSubscription.response.status;

        console.log(`🔄 [${eventId}] Nuevo estado: ${status}`);
        await subscription.update({ estado_suscripcion: status });

        if (status === 'cancelled' || status === 'paused') {
          await Usuario.update(
            { membresia: 'free' },
            { where: { id_usuario: subscription.usuario_id } }
          );
        }
      }
    }

    console.log(`✅ [${eventId}] Webhook procesado exitosamente`);
    res.sendStatus(200);

  } catch (error) {
    console.error(`❌ [${eventId}] Error en webhook:`, error.message);
    res.status(500).json({ 
      error: 'Error procesando webhook',
      eventId
    });
  }
};