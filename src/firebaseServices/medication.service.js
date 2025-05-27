import cron from 'node-cron';
import { Op } from 'sequelize';
import {  Paciente } from '../models/paciente.model.js';
import { PacienteMedicamento } from '../models/pacienteMedicamento.model.js';
import { NotificationService } from './notification.service.js';

function parseFrecuencia(frecuencia) {
  const match = frecuencia?.match(/^(\d+)([hd])$/);
  if (!match) return null;

  const valor = parseInt(match[1]);
  const unidad = match[2];

  if (unidad === 'h') return valor * 60 * 60 * 1000;
  if (unidad === 'd') return valor * 24 * 60 * 60 * 1000;

  return null;
}

export class MedicationNotificationService {
  static start() {
    // Ejecutar cada 10 minutos
    cron.schedule('*/10 * * * *', this.checkMedicationNotifications.bind(this));
    console.log('Medication notification scheduler started');
  }

  static async checkMedicationNotifications() {
    const now = new Date();

    try {
      const tratamientos = await PacienteMedicamento.findAll({
        where: {
          notificaciones_activas: true,
          fecha_inicio: { [Op.lte]: now },
          fecha_fin: { [Op.gte]: now },
        },
        include: [Paciente]
      });

      for (const tratamiento of tratamientos) {
        const frecuenciaMs = parseFrecuencia(tratamiento.frecuencia);
        if (!frecuenciaMs) continue;

        const proxima = tratamiento.proxima_dosis || tratamiento.fecha_inicio;

        if (now >= proxima) {
          await NotificationService.sendPushNotification({
            token: tratamiento.Paciente?.fcm_token,
            title: '💊 Recordatorio de Medicación',
            body: `Es hora de tomar: ${tratamiento.dosis || 'tu medicamento'}`,
            data: {
              type: 'medication',
              id: tratamiento.id_pac_medicamento.toString()
            }
          });

          await tratamiento.update({
            ultimo_recordatorio: now,
            proxima_dosis: new Date(now.getTime() + frecuenciaMs)
          });
        }
      }
    } catch (error) {
      console.error('Error in medication notifications:', error);
    }
  }
}