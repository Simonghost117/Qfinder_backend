import { Paciente, Cuidador, Subscription } from '../models/index.js';

export const checkPatientLimit = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    
    const subscription = await Subscription.findOne({
      where: { usuario_id: userId }
    });

    let maxPatients = 2;
    if (subscription && subscription.estado_suscripcion === 'active') {
      maxPatients = subscription.limite_pacientes;
    }

    const patientCount = await Paciente.count({
      where: { usuario_id: userId }
    });

    if (patientCount >= maxPatients) {
      return res.status(403).json({
        error: `Límite de pacientes alcanzado (${maxPatients})`,
        upgradeRequired: maxPatients === 2,
        currentPlan: subscription ? subscription.tipo_suscripcion : 'free',
        used: patientCount,
        limit: maxPatients
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: 'active'
      }
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'Se requiere suscripción activa',
        upgradeRequired: true,
        currentPlan: 'free'
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePremiumPlan = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: 'active',
        tipo_suscripcion: ['plus', 'pro']
      }
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'Se requiere plan premium',
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};