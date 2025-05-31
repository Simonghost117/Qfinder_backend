import cron from 'node-cron';
import { Op } from 'sequelize';
import  {ActividadCuidado} from '../models/activity.model.js';
import  Paciente from '../models/paciente.model.js';
import { NotificationService } from './notification.service.js';

export class ActivityNotificationService {
  static start() {
    // Ejecutar cada 30 minutos
    cron.schedule('*/30 * * * *', this.checkActivityNotifications.bind(this));
    console.log('Activity notification scheduler started');
  }

  static async checkActivityNotifications() {
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      const actividades = await ActividadCuidado.findAll({
        where: {
          fecha_actividad: {
            [Op.between]: [now, thirtyMinutesLater]
          },
          estado: 'pendiente'
        },
        include: [Paciente]
      });

      for (const actividad of actividades) {
        await NotificationService.sendPushNotification({
          token: actividad.Paciente?.fcm_token,
          title: '🏋️ Actividad próxima',
          body: `Tienes una actividad de ${actividad.tipo_actividad} programada`,
          data: {
            type: 'activity',
            id: actividad.id_actividad.toString()
          }
        });

        await actividad.update({ notificado: true });
      }
    } catch (error) {
      console.error('Error in activity notifications:', error);
    }
  }
}