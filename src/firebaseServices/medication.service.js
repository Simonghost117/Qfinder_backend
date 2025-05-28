import cron from 'node-cron';
import { Op } from 'sequelize';
import { Paciente, PacienteMedicamento, Medicamento } from '../models/index.js';
import { NotificationService } from './notification.service.js';
import logger from '../utils/logger.js';

export class MedicationNotificationService {
  static start() {
    // Ejecutar cada 10 minutos
    cron.schedule('*/10 * * * *', this.checkMedicationNotifications.bind(this));
    logger.info('Medication notification scheduler started');
  }

  static parseFrecuencia(frecuencia) {
    if (!frecuencia) return null;
    
    // Formatos soportados: "8h", "24h", "3d", "12h", etc.
    const match = frecuencia.match(/^(\d+)([hd])$/i);
    if (!match) return null;

    const valor = parseInt(match[1]);
    const unidad = match[2].toLowerCase();

    if (unidad === 'h') return valor * 60 * 60 * 1000; // horas a milisegundos
    if (unidad === 'd') return valor * 24 * 60 * 60 * 1000; // días a milisegundos

    return null;
  }

  static async checkMedicationNotifications() {
    const now = new Date();
    logger.debug('Checking medication notifications...');

    try {
      const tratamientos = await PacienteMedicamento.findAll({
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
        order: [['proxima_dosis', 'ASC']] // Ordenar por próxima dosis más cercana
      });

      if (tratamientos.length === 0) {
        logger.debug('No active medication treatments found for notification');
        return;
      }

      const notificationResults = [];
      
      for (const tratamiento of tratamientos) {
        try {
          const frecuenciaMs = this.parseFrecuencia(tratamiento.frecuencia);
          if (!frecuenciaMs) {
            logger.warn(`Invalid frequency format for treatment ID: ${tratamiento.id_pac_medicamento}`);
            continue;
          }

          const proximaDosis = tratamiento.proxima_dosis || tratamiento.fecha_inicio;
          const ahora = new Date();

          if (ahora >= proximaDosis) {
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

            // Enviar notificación
            await NotificationService.sendPushNotification(notificationData);
            
            // Actualizar fechas después de enviar la notificación
            const nuevaProximaDosis = new Date(now.getTime() + frecuenciaMs);
            await tratamiento.update({
              ultimo_recordatorio: now,
              proxima_dosis: nuevaProximaDosis
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
          
          // Opcional: Desactivar notificaciones si fallan repetidamente
          if (error.code === 'messaging/invalid-registration-token') {
            await tratamiento.update({ notificaciones_activas: false });
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
      throw error; // Propagar el error para manejo global
    }
  }

  // Método adicional para verificar tratamientos próximos
  static async getUpcomingTreatments(minutesAhead = 60) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
    
    return PacienteMedicamento.findAll({
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
      }]
    });
  }
}