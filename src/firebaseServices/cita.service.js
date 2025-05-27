import cron from 'node-cron';
import { Op } from 'sequelize';
import { CitaMedica, Paciente } from '../models/index.js';
import { NotificationService } from './notification.service.js';

export class AppointmentNotificationService {
  static start() {
    // Ejecutar cada hora
    cron.schedule('0 * * * *', this.checkAppointmentNotifications.bind(this));
    console.log('Appointment notification scheduler started');
  }

  static async checkAppointmentNotifications() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      // Notificaciones para citas en 1 hora
      const citasProximas = await CitaMedica.findAll({
        where: {
          fecha_cita: {
            [Op.between]: [now, oneHourLater]
          },
          estado_cita: 'programada',
          notificado_1h: false
        },
        include: [Paciente]
      });

      for (const cita of citasProximas) {
        await NotificationService.sendPushNotification({
          token: cita.Paciente?.fcm_token,
          title: '⏰ Cita próxima',
          body: `Tienes una cita de ${cita.titulo} en 1 hora`,
          data: {
            type: 'appointment',
            id: cita.id_cita.toString()
          }
        });

        await cita.update({ notificado_1h: true });
      }

      // Notificaciones para citas en 24 horas
      const citasManana = await CitaMedica.findAll({
        where: {
          fecha_cita: {
            [Op.between]: [oneHourLater, oneDayLater]
          },
          estado_cita: 'programada',
          notificado_24h: false
        },
        include: [Paciente]
      });

      for (const cita of citasManana) {
        await NotificationService.sendPushNotification({
          token: cita.Paciente?.fcm_token,
          title: '📅 Recordatorio de cita',
          body: `Recuerda tu cita de ${cita.titulo} mañana`,
          data: {
            type: 'appointment',
            id: cita.id_cita.toString()
          }
        });

        await cita.update({ notificado_24h: true });
      }
    } catch (error) {
      console.error('Error in appointment notifications:', error);
    }
  }
}