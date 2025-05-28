import cron from 'node-cron';
import { Op } from 'sequelize';
import Paciente from '../models/paciente.model.js';
import Medicamento from '../models/medicamento.model.js';
import PacienteMedicamento from '../models/pacienteMedicamento.model.js';
import { NotificationService } from './notification.service.js';
import logger from '../utils/logger.js';

export class MedicationNotificationService {
  static start() {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', this.checkMedicationNotifications.bind(this));
    logger.info('Medication notification scheduler started');
  }

  static parseFrecuencia(frecuencia) {
    if (!frecuencia) {
      logger.warn('Empty frequency string received');
      return null;
    }
    
    // Supported formats: "8h", "24h", "3d", "12h", etc.
    const match = frecuencia.match(/^(\d+)([hd])$/i);
    if (!match) {
      logger.warn(`Invalid frequency format: ${frecuencia}`);
      return null;
    }

    const valor = parseInt(match[1]);
    const unidad = match[2].toLowerCase();

    if (unidad === 'h') return valor * 60 * 60 * 1000; // hours to milliseconds
    if (unidad === 'd') return valor * 24 * 60 * 60 * 1000; // days to milliseconds

    logger.warn(`Unsupported frequency unit: ${unidad}`);
    return null;
  }

  static async checkMedicationNotifications() {
    const now = new Date();
    logger.debug('Checking medication notifications...');

    try {
      const tratamientos = await PacienteMedicamento.findAll({
        attributes: [
          'id_pac_medicamento',
          'id_paciente',
          'id_medicamento',
          'fecha_inicio',
          'fecha_fin',
          'dosis',
          'frecuencia',
          'proxima_dosis',
          'ultimo_recordatorio',
          'notificaciones_activas'
        ],
        where: {
          notificaciones_activas: true,
          fecha_inicio: { [Op.lte]: now },
          fecha_fin: { [Op.gte]: now },
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
        }],
        order: [['proxima_dosis', 'ASC']]
      });

      if (!tratamientos || tratamientos.length === 0) {
        logger.debug('No active medication treatments found for notification');
        return [];
      }

      const notificationResults = [];
      
      for (const tratamiento of tratamientos) {
        try {
          // Validate required fields
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

          const proximaDosis = tratamiento.proxima_dosis || tratamiento.fecha_inicio;
          if (!(proximaDosis instanceof Date)) {
            logger.warn(`Invalid next dose date for treatment ID: ${tratamiento.id_pac_medicamento}`);
            continue;
          }

          if (now >= proximaDosis) {
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
                pacienteNombre: `${tratamiento.Paciente.nombre} ${tratamiento.Paciente.apellido}`
              }
            };

            // Send notification
            await NotificationService.sendPushNotification(notificationData);
            
            // Update dates after sending notification
            const nuevaProximaDosis = new Date(now.getTime() + frecuenciaMs);
            await PacienteMedicamento.update({
              ultimo_recordatorio: now,
              proxima_dosis: nuevaProximaDosis
            }, {
              where: { id_pac_medicamento: tratamiento.id_pac_medicamento }
            });
            
            notificationResults.push({
              success: true,
              treatmentId: tratamiento.id_pac_medicamento,
              patientId: tratamiento.id_paciente,
              nextDose: nuevaProximaDosis
            });
            
            logger.info(`Medication reminder sent for ${tratamiento.Paciente.nombre} (Treatment ID: ${tratamiento.id_pac_medicamento})`);
          }
        } catch (error) {
          logger.error(`Failed to process treatment ID: ${tratamiento.id_pac_medicamento}`, error);
          notificationResults.push({
            success: false,
            treatmentId: tratamiento.id_pac_medicamento,
            error: error.message
          });
          
          // Disable notifications if token is invalid
          if (error.code === 'messaging/invalid-registration-token') {
            await PacienteMedicamento.update(
              { notificaciones_activas: false },
              { where: { id_pac_medicamento: tratamiento.id_pac_medicamento } }
            );
            logger.warn(`Disabled notifications for treatment ID: ${tratamiento.id_pac_medicamento} due to invalid token`);
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

  static async getUpcomingTreatments(minutesAhead = 60) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
    
    return PacienteMedicamento.findAll({
      attributes: [
        'id_pac_medicamento',
        'id_paciente',
        'id_medicamento',
        'fecha_inicio',
        'fecha_fin',
        'dosis',
        'frecuencia',
        'proxima_dosis'
      ],
      where: {
        notificaciones_activas: true,
        proxima_dosis: {
          [Op.between]: [now, futureTime]
        }
      },
      include: [{
        model: Paciente,
        as: 'Paciente',
        attributes: ['id_paciente', 'nombre', 'apellido', 'fcm_token']
      }],
      order: [['proxima_dosis', 'ASC']]
    });
  }
}