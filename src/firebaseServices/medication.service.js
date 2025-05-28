import cron from 'node-cron';
import { Op } from 'sequelize';
import { Paciente, PacienteMedicamento, Medicamento } from '../models/index.js';
import { NotificationService } from './notification.service.js';
import logger from '../utils/logger.js';

export class MedicationNotificationService {
  static start() {
    cron.schedule('*/10 * * * *', this.checkMedicationNotifications.bind(this));
    logger.info('Medication notification scheduler started');
  }

  static parseFrecuencia(frecuencia) {
    if (!frecuencia) return null;
    const match = frecuencia.match(/^(\d+)([hd])$/i);
    if (!match) return null;

    const valor = parseInt(match[1]);
    const unidad = match[2].toLowerCase();

    if (unidad === 'h') return valor * 60 * 60 * 1000;
    if (unidad === 'd') return valor * 24 * 60 * 60 * 1000;
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
          'proxima_dosis', // ADDED THIS MISSING COLUMN
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

      // Rest of your method remains the same...
      for (const tratamiento of tratamientos) {
        const frecuenciaMs = this.parseFrecuencia(tratamiento.frecuencia);
        if (!frecuenciaMs) continue;

        const proximaDosis = tratamiento.proxima_dosis || tratamiento.fecha_inicio;
        
        if (now >= proximaDosis) {
          // Send notification and update logic...
        }
      }
    } catch (error) {
      logger.error('Error in medication notifications:', error);
      throw error;
    }
  }
}