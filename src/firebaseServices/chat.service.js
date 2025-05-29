// En tu archivo chat.service.js
import { db, messaging } from '../config/firebase-admin.js';
import Usuario from '../models/usuario.model.js';
import  UsuarioRed  from '../models/usuarioRed.model.js';

export class ChatNotificationService {
  static async setupListeners() {
    try {
      console.log('Setting up chat listeners...');
      
      // Escuchar nuevas comunidades creadas
      const comunidadesRef = db.ref('chats');
      comunidadesRef.on('child_added', (snapshot) => {
        const comunidadId = snapshot.key;
        this.setupCommunityListeners(comunidadId);
      });

      // Configurar listeners para comunidades existentes
      const comunidadesSnapshot = await comunidadesRef.once('value');
      comunidadesSnapshot.forEach((comunidadSnapshot) => {
        this.setupCommunityListeners(comunidadSnapshot.key);
      });

      console.log('Chat listeners setup complete');
    } catch (error) {
      console.error('Error setting up chat listeners:', error);
    }
  }

  static setupCommunityListeners(comunidadId) {
    console.log(`Setting up listener for community: ${comunidadId}`);
    
    const mensajesRef = db.ref(`chats/${comunidadId}/mensajes`);
    
    mensajesRef.orderByChild('fecha_envio').limitToLast(1).on('child_added', async (snapshot) => {
      const mensaje = snapshot.val();
      
      if (!mensaje || mensaje.estado === 'notified') return;
      
      try {
        console.log(`New message in community ${comunidadId} from user ${mensaje.idUsuario}`);
        
        // Obtener todos los miembros de la comunidad excepto el remitente
        const miembros = await this.getCommunityMembers(comunidadId, mensaje.idUsuario);
        
        // Enviar notificaciones
        await this.sendNotifications(miembros, comunidadId, mensaje);
        
        // Marcar mensaje como notificado
        await snapshot.ref.update({ estado: 'notified' });
      } catch (error) {
        console.error('Error processing chat message:', error);
      }
    });
  }

  static async getCommunityMembers(comunidadId, senderId) {
    // Implementación mejorada para obtener miembros desde tu base de datos SQL
    const miembros = await UsuarioRed.findAll({
      where: { id_red: comunidadId },
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'fcm_token']
      }]
    });

    return miembros
      .filter(m => m.Usuario.id_usuario.toString() !== senderId)
      .map(m => ({
        id_usuario: m.Usuario.id_usuario,
        fcm_token: m.Usuario.fcm_token
      }));
  }

  static async sendNotifications(miembros, comunidadId, mensaje) {
    const notificationPromises = miembros
      .filter(miembro => miembro.fcm_token)
      .map(miembro => {
        const notification = {
          token: miembro.fcm_token,
          notification: {
            title: `💬 Nuevo mensaje en ${comunidadId}`,
            body: mensaje.contenido.length > 100 
              ? mensaje.contenido.substring(0, 100) + '...' 
              : mensaje.contenido
          },
          data: {
            type: 'chat',
            comunidadId,
            mensajeId: snapshot.key,
            senderId: mensaje.idUsuario,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          android: {
            priority: 'high'
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        };

        return messaging.send(notification)
          .then(() => {
            console.log(`Notification sent to user ${miembro.id_usuario}`);
            return true;
          })
          .catch(error => {
            console.error(`Error sending notification to user ${miembro.id_usuario}:`, error);
            return false;
          });
      });

    await Promise.all(notificationPromises);
  }
}