import { db } from '../config/firebase-admin.js';
import { NotificationService } from './notification.service.js';

export class ChatNotificationService {
  static setupListeners() {
    // Escuchar nuevos mensajes en todas las comunidades
    const ref = db.ref('chats');
    
    ref.on('child_added', (snapshot) => {
      const comunidadId = snapshot.key;
      this.setupCommunityListeners(comunidadId);
    });
  }

  static setupCommunityListeners(comunidadId) {
    const mensajesRef = db.ref(`chats/${comunidadId}/mensajes`);
    
    mensajesRef.orderByChild('fecha_envio').limitToLast(1).on('child_added', async (snapshot) => {
      const mensaje = snapshot.val();
      
      if (!mensaje || mensaje.estado === 'enviado') return;
      
      try {
        // Obtener todos los miembros de la comunidad excepto el remitente
        const miembrosSnapshot = await db.ref(`comunidades/${comunidadId}/miembros`).once('value');
        const miembros = miembrosSnapshot.val();
        
        for (const userId in miembros) {
          if (userId !== mensaje.id_remitente) {
            const userData = miembros[userId];
            
            if (userData.fcm_token) {
              await NotificationService.sendPushNotification({
                token: userData.fcm_token,
                title: `💬 Nuevo mensaje en ${comunidadId}`,
                body: mensaje.contenido || 'Tienes un nuevo mensaje',
                data: {
                  type: 'chat',
                  comunidadId,
                  mensajeId: snapshot.key
                }
              });
            }
          }
        }
        
        // Marcar mensaje como enviado
        await snapshot.ref.update({ estado: 'enviado' });
      } catch (error) {
        console.error('Error sending chat notifications:', error);
      }
    });
  }
}