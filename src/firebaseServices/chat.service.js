import { db } from '../config/firebase-admin.js';
import { NotificationService } from './notification.service.js';
import Usuario from '../models/usuario.model.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Red from '../models/Red.js';
import logger from '../utils/logger.js';

export class ChatNotificationService {
  /**
   * Configura listeners para nuevas comunidades
   */
  static async setupListeners() {
    try {
      logger.info('Setting up chat listeners...');
      
      const comunidadesRef = db.ref('chats');
      
      // Listener para nuevas comunidades
      comunidadesRef.on('child_added', (snapshot) => {
        this.setupCommunityListeners(snapshot.key);
      });

      // Configurar listeners para comunidades existentes
      const comunidadesSnapshot = await comunidadesRef.once('value');
      comunidadesSnapshot.forEach((comunidadSnapshot) => {
        this.setupCommunityListeners(comunidadSnapshot.key);
      });

      logger.info('Chat listeners setup complete');
    } catch (error) {
      logger.error('Error setting up chat listeners:', error);
    }
  }

  /**
   * Configura listeners para una comunidad específica
   */
  static setupCommunityListeners(comunidadId) {
    logger.info(`Setting up listener for community: ${comunidadId}`);
    
    const mensajesRef = db.ref(`chats/${comunidadId}/mensajes`);
    
    mensajesRef.orderByChild('fecha_envio').limitToLast(1).on('child_added', async (snapshot) => {
      const mensaje = snapshot.val();
      
      if (!mensaje || mensaje.estado === 'notified') return;
      
      try {
        logger.info(`New message in community ${comunidadId} from user ${mensaje.idUsuario}`);
        
        // Obtener información de la comunidad
        const comunidad = await Red.findByPk(comunidadId, {
          attributes: ['nombre_red']
        });

        if (!comunidad) {
          logger.warn(`Community ${comunidadId} not found in database`);
          return;
        }

        // Obtener miembros para notificar
        const miembros = await this.getMembersToNotify(comunidadId, mensaje.idUsuario);
        
        if (miembros.length === 0) {
          logger.info('No members to notify');
          return;
        }

        // Enviar notificaciones
        await this.sendChatNotifications({
          comunidadId,
          comunidadNombre: comunidad.nombre_red,
          miembros,
          mensaje,
          mensajeId: snapshot.key
        });
        
        // Marcar mensaje como notificado
        await snapshot.ref.update({ estado: 'notified' });
      } catch (error) {
        logger.error('Error processing chat message:', error);
      }
    });
  }

  /**
   * Obtiene los miembros que deben recibir notificaciones
   */
  static async getMembersToNotify(comunidadId, senderId) {
    try {
      const miembros = await UsuarioRed.findAll({
        where: { 
          id_red: comunidadId,
          id_usuario: { [Op.ne]: senderId }
        },
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'fcm_token'],
          where: {
            fcm_token: { [Op.not]: null }
          }
        }]
      });

      return miembros.map(m => ({
        id_usuario: m.usuario.id_usuario,
        fcm_token: m.usuario.fcm_token
      }));
    } catch (error) {
      logger.error('Error getting community members:', error);
      return [];
    }
  }

  /**
   * Envía notificaciones de chat
   */
  static async sendChatNotifications({ comunidadId, comunidadNombre, miembros, mensaje, mensajeId }) {
    const tokens = miembros.map(m => m.fcm_token).filter(t => t);
    
    if (tokens.length === 0) {
      logger.info('No valid FCM tokens to notify');
      return;
    }

    try {
      const title = `💬 ${comunidadNombre}`;
      const body = mensaje.contenido.length > 100 
        ? `${mensaje.contenido.substring(0, 100)}...` 
        : mensaje.contenido;

      const result = await NotificationService.sendToMultiple(tokens, {
        title,
        body,
        data: {
          type: 'chat',
          comunidadId,
          mensajeId,
          senderId: mensaje.idUsuario,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      });

      logger.info(`Chat notifications sent for message ${mensajeId}`, {
        successCount: result.successCount,
        failureCount: result.failureCount
      });

    } catch (error) {
      logger.error('Error sending chat notifications:', error);
    }
  }

  /**
   * Limpieza periódica de tokens inválidos
   */
  static async cleanUpInvalidTokens() {
    try {
      logger.info('Starting invalid FCM tokens cleanup...');
      
      const usersWithTokens = await Usuario.findAll({
        where: { fcm_token: { [Op.not]: null } },
        attributes: ['id_usuario', 'fcm_token']
      });
      
      const invalidTokens = [];
      
      for (const user of usersWithTokens) {
        try {
          await NotificationService.validateToken(user.fcm_token);
        } catch (error) {
          invalidTokens.push(user.fcm_token);
        }
      }
      
      if (invalidTokens.length > 0) {
        await NotificationService.removeInvalidTokens(invalidTokens);
        logger.info(`Cleaned up ${invalidTokens.length} invalid tokens`);
      } else {
        logger.info('No invalid tokens found');
      }
    } catch (error) {
      logger.error('Error during tokens cleanup:', error);
    }
  }
}

// Configurar limpieza periódica (ejecutar una vez al día)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
setInterval(() => {
  ChatNotificationService.cleanUpInvalidTokens();
}, CLEANUP_INTERVAL);

// Iniciar el servicio al cargar el módulo
ChatNotificationService.setupListeners();