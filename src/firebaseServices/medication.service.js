import cron from 'node-cron';
import { Op } from 'sequelize';
import Paciente from '../models/paciente.model.js';
import Medicamento from '../models/medicamento.model.js';
import PacienteMedicamento from '../models/pacienteMedicamento.model.js';
import { NotificationService } from './notification.service.js';
import logger from '../utils/logger.js';

export class MedicationNotificationService {
  static start() {
    // Ejecutar cada 10 minutos
    cron.schedule('*/10 * * * *', this.checkMedicationNotifications.bind(this));
    logger.info('Medication notification scheduler started');
  }

  static parseFrecuencia(frecuencia) {
    if (!frecuencia) {
      logger.warn('Empty frequency string received');
      return null;
    }
    
    // Formatos soportados: "8h", "24h", "3d", "12h", etc.
    const match = frecuencia.match(/^(\d+)([hd])$/i);
    if (!match) {
      logger.warn(`Invalid frequency format: ${frecuencia}`);
      return null;
    }

    const valor = parseInt(match[1]);
    const unidad = match[2].toLowerCase();

    if (unidad === 'h') return valor * 60 * 60 * 1000; // horas a milisegundos
    if (unidad === 'd') return valor * 24 * 60 * 60 * 1000; // días a milisegundos

    logger.warn(`Unsupported frequency unit: ${unidad}`);
    return null;
  }

  static async checkMedicationNotifications() {
    const now = new Date();
    logger.debug('Checking medication notifications...');

    try {
      // Obtener todos los tratamientos activos (sin filtrar por notificaciones_activas)
      const tratamientos = await PacienteMedicamento.findAll({
        attributes: [
          'id_pac_medicamento',
          'id_paciente',
          'id_medicamento',
          'fecha_inicio',
          'fecha_fin',
          'dosis',
          'frecuencia'
        ],
        where: {
          fecha_inicio: { [Op.lte]: now },
          fecha_fin: { [Op.gte]: now }
        },
        include: [{
          model: Paciente,
          as: 'Paciente',
          where: {
            fcm_token: { [Op.not]: null }
          },
          attributes: ['id_paciente', 'fcm_token', 'nombre', 'apellido']
        }, {
          model: Medicamento,
          as: 'Medicamento',
          attributes: ['id_medicamento', 'nombre', 'tipo']
        }]
      });

      if (!tratamientos || tratamientos.length === 0) {
        logger.debug('No active medication treatments found');
        return [];
      }

      const notificationResults = [];
      
      for (const tratamiento of tratamientos) {
        try {
          // Validar campos requeridos
          if (!tratamiento.Paciente?.fcm_token) {
            logger.warn(`Patient ${tratamiento.id_paciente} has no FCM token`);
            continue;
          }

          if (!tratamiento.Medicamento) {
            logger.warn(`Treatment ${tratamiento.id_pac_medicamento} has no associated medication`);
            continue;
          }

          const frecuenciaMs = this.parseFrecuencia(tratamiento.frecuencia);
          if (!frecuenciaMs) {
            logger.warn(`Invalid frequency for treatment ID: ${tratamiento.id_pac_medicamento}`);
            continue;
          }

          // Calcular próxima dosis basada en la frecuencia
          const ultimaNotificacion = now; // Simulamos que siempre notificamos ahora
          const proximaDosis = new Date(ultimaNotificacion.getTime() + frecuenciaMs);

          // Enviar notificación (sin verificar proxima_dosis)
          const notificationData = {
            token: tratamiento.Paciente.fcm_token,
            title: '💊 Recordatorio de Medicación',
            body: `Es hora de tomar: ${tratamiento.Medicamento.nombre} - ${tratamiento.dosis || 'Dosis indicada'}`,
            data: {
              type: 'medication',
              id: tratamiento.id_pac_medicamento.toString(),
              medicamentoId: tratamiento.id_medicamento.toString(),
              pacienteId: tratamiento.id_paciente.toString(),
              action: 'take_medication',
              pacienteNombre: `${tratamiento.Paciente.nombre} ${tratamiento.Paciente.apellido}`,
              nextDoseTime: proximaDosis.toISOString()
            }
          };

          await NotificationService.sendPushNotification(notificationData);
          
          notificationResults.push({
            success: true,
            treatmentId: tratamiento.id_pac_medicamento,
            patientId: tratamiento.id_paciente,
            nextDose: proximaDosis
          });
          
          logger.info(`Medication reminder sent for ${tratamiento.Paciente.nombre}`);
        } catch (error) {
          logger.error(`Failed to process treatment ID: ${tratamiento.id_pac_medicamento}`, error);
          notificationResults.push({
            success: false,
            treatmentId: tratamiento.id_pac_medicamento,
            error: error.message
          });
          
          // Manejar tokens inválidos (aunque no tengamos notificaciones_activas)
          if (error.code === 'messaging/invalid-registration-token') {
            logger.warn(`Invalid token for treatment ID: ${tratamiento.id_pac_medicamento}`);
          }
        }
      }

      logger.debug('Medication notification batch completed', {
        total: tratamientos.length,
        success: notificationResults.filter(r => r.success).length,
        failed: notificationResults.filter(r => !r.success).length
      });
      
      return notificationResults;
    } catch (error) {
      logger.error('Error in medication notifications scheduler:', error);
      throw error;
    }
  }

  // Método para obtener tratamientos que necesitan notificación pronto
  static async getTreatmentsNeedingNotification() {
    const now = new Date();
    
    const tratamientos = await PacienteMedicamento.findAll({
      attributes: [
        'id_pac_medicamento',
        'id_paciente',
        'id_medicamento',
        'fecha_inicio',
        'fecha_fin',
        'dosis',
        'frecuencia'
      ],
      where: {
        fecha_inicio: { [Op.lte]: now },
        fecha_fin: { [Op.gte]: now }
      },
      include: [{
        model: Paciente,
        as: 'Paciente',
        attributes: ['id_paciente', 'nombre', 'apellido', 'fcm_token']
      }]
    });

    return tratamientos.map(tratamiento => {
      const frecuenciaMs = this.parseFrecuencia(tratamiento.frecuencia) || 0;
      return {
        ...tratamiento.toJSON(),
        proximaDosis: frecuenciaMs > 0 ? 
          new Date(now.getTime() + frecuenciaMs) : 
          null
      };
    });
  }
}