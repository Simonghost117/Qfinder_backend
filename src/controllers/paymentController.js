import mercadopago from 'mercadopago';
import { models } from '../models/index.js';
const { Usuario, Subscription } = models;
import { SUBSCRIPTION_LIMITS, PLANS_MERCADOPAGO } from '../config/subscriptions.js';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuración robusta de MercadoPago
console.log("🔧 Inicializando módulo de pagos...");
try {
  mercadopago.configurations.setAccessToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
  console.log("✅ SDK MercadoPago inicializado correctamente");
  console.log("Modo:", mercadopago.configurations.sandbox ? "Sandbox" : "Producción");
} catch (error) {
  console.error("❌ Error fatal configurando MercadoPago:", error);
  throw new Error("Configuración de MercadoPago fallida");
}

// 2. Función interna para crear planes
const createSubscriptionPlanInternal = async (planType) => {
  try {
    console.log(`🛠 Creando plan ${planType}...`);
    
    // Verificación exhaustiva del SDK
    if (!mercadopago?.preapproval_plan?.create) {
      throw new Error("SDK no inicializado correctamente - falta preapproval_plan.create");
    }

    const plan = PLANS_MERCADOPAGO[planType];
    if (!plan) throw new Error(`Plan ${planType} no definido en configuración`);

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
      back_url: process.env.MERCADOPAGO_BACK_URL || "https://tudominio.com/return"
    };

    console.log("Enviando a MercadoPago:", { planType, amount: plan.amount });
    const mpPlan = await mercadopago.preapproval_plan.create(planData);
    
    if (!mpPlan?.response?.id) {
      throw new Error("Respuesta inválida de MercadoPago");
    }

    PLANS_MERCADOPAGO[planType].id = mpPlan.response.id;
    console.log(`✅ Plan creado - ID: ${mpPlan.response.id}`);
    return mpPlan.response.id;
  } catch (error) {
    console.error(`❌ Error en plan ${planType}:`, error.message);
    if (error.response) {
      console.error("Detalles error:", JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
};

// 3. Inicialización de planes (versión robusta)
export const initializePlans = async () => {
  console.log("\n⚙️ Iniciando inicialización de planes...");
  try {
    let success = true;
    
    for (const [planType, config] of Object.entries(PLANS_MERCADOPAGO)) {
      try {
        if (!config.id) {
          console.log(`🔄 Creando ${planType}...`);
          const planId = await createSubscriptionPlanInternal(planType);
          PLANS_MERCADOPAGO[planType].id = planId;
          console.log(`✔ ${planType} creado (ID: ${planId})`);
        } else {
          console.log(`ℹ️ ${planType} ya existe (ID: ${config.id})`);
        }
      } catch (error) {
        console.error(`❌ Falló ${planType}:`, error.message);
        success = false;
      }
    }

    if (!success) throw new Error("Algunos planes no se crearon");
    console.log("✅ Todos los planes listos");
    return true;
  } catch (error) {
    console.error("❌ Error crítico en initializePlans:", error.message);
    return false;
  }
};

// 4. Controlador para crear planes (endpoint)
export const createSubscriptionPlan = async (req, res) => {
  const { planType } = req.body;
  console.log(`\n📝 Solicitud crear plan: ${planType}`);

  try {
    if (!PLANS_MERCADOPAGO[planType]) {
      return res.status(400).json({ error: 'Tipo de plan no válido' });
    }

    const planId = await createSubscriptionPlanInternal(planType);
    
    res.status(201).json({
      success: true,
      planId,
      planDetails: PLANS_MERCADOPAGO[planType]
    });
  } catch (error) {
    console.error(`❌ Error en createSubscriptionPlan:`, error.message);
    res.status(500).json({
      error: 'Error al crear plan',
      message: error.message,
      details: error.response?.body || null
    });
  }
};

// 5. Crear suscripción para usuario (versión mejorada)
export const createUserSubscription = async (req, res) => {
  const { userId, planType } = req.body;
  const transactionId = `sub_${Date.now()}`;
  console.log(`\n📝 [${transactionId}] Nueva suscripción - Usuario: ${userId}, Plan: ${planType}`);

  try {
    // Validaciones
    if (!userId || !planType) {
      throw new Error('Faltan userId o planType');
    }

    const plan = PLANS_MERCADOPAGO[planType];
    if (!plan?.id) {
      throw new Error('Plan no configurado');
    }

    const user = await Usuario.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar suscripción existente
    const exists = await Subscription.findOne({
      where: { usuario_id: userId, estado_suscripcion: ['active', 'pending'] }
    });
    if (exists) {
      throw new Error('Usuario ya tiene suscripción activa/pendiente');
    }

    // Crear en MercadoPago
    const subData = {
      preapproval_plan_id: plan.id,
      payer_email: user.correo_usuario,
      external_reference: `USER_${userId}_${transactionId}`,
      reason: plan.description,
      back_url: process.env.MERCADOPAGO_BACK_URL
    };

    console.log("Creando suscripción en MercadoPago...");
    const mpSub = await mercadopago.preapproval.create(subData);
    
    if (!mpSub?.response?.id) {
      throw new Error('Error al crear suscripción en MercadoPago');
    }

    // Guardar en DB
    const newSub = await Subscription.create({
      usuario_id: userId,
      mercado_pago_id: mpSub.response.id,
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
      subscriptionId: newSub.id_subscription,
      initPoint: mpSub.response.init_point,
      status: mpSub.response.status,
      transactionId
    });

  } catch (error) {
    console.error(`❌ [${transactionId}] Error:`, error.message);
    res.status(500).json({
      error: 'Error al crear suscripción',
      message: error.message,
      transactionId
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