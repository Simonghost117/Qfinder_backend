import { db, auth, messaging } from '../config/firebase-admin.js';
import Usuario from '../models/usuario.model.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Red from '../models/Red.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import { verifyToken } from '../middlewares/verifyToken.js';



/**
 * @class ChatController
 * @description Controlador para manejar las operaciones del chat
 */
class ChatController {
  /**
   * @method enviarMensaje
   * @description Envía un mensaje a un chat de comunidad
   */
  static async enviarMensaje(req, res) {
    try {
      const { id_red } = req.params;
      const { id_usuario } = req.user;
      const { contenido } = req.body;

      // Validación básica
      if (!contenido || contenido.trim().length === 0) {
        return errorResponse(res, 'El contenido del mensaje no puede estar vacío', 400);
      }

      // 1. Verificar que el usuario es miembro de la red
      const membresia = await UsuarioRed.findOne({
        where: { id_usuario, id_red }
      });

      if (!membresia) {
        return errorResponse(res, 'No tienes permisos para enviar mensajes en esta comunidad', 403);
      }

      // 2. Obtener datos del usuario remitente
      const usuario = await Usuario.findByPk(id_usuario, {
        attributes: ['nombre_usuario', 'apellido_usuario', 'foto_perfil']
      });

      if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
      }

      const nombreUsuario = `${usuario.nombre_usuario} ${usuario.apellido_usuario}`;

      // 3. Crear objeto de mensaje para Firebase
      const nuevoMensaje = {
        idUsuario: id_usuario.toString(),
        nombreUsuario,
        contenido: contenido.trim(),
        fotoPerfil: usuario.foto_perfil || null,
        fecha_envio: Date.now(),
        estado: 'pending_notification' // Estado inicial antes de notificar
      };

      // 4. Guardar mensaje en Firebase Realtime Database
      const mensajeRef = db.ref(`chats/${id_red}/mensajes`).push();
      await mensajeRef.set(nuevoMensaje);

      // 5. Obtener información de la comunidad para la notificación
      const comunidad = await Red.findByPk(id_red, {
        attributes: ['nombre_red']
      });

      // 6. Preparar y enviar notificaciones push (en segundo plano)
      this.enviarNotificacionesPush({
        comunidadId: id_red,
        comunidadNombre: comunidad?.nombre_red || 'Comunidad',
        mensajeId: mensajeRef.key,
        mensaje: nuevoMensaje,
        remitenteId: id_usuario
      }).catch(error => {
        console.error('Error enviando notificaciones:', error);
      });

      return successResponse(res, 'Mensaje enviado correctamente', {
        idMensaje: mensajeRef.key,
        fecha_envio: nuevoMensaje.fecha_envio
      }, 201);

    } catch (error) {
      console.error('Error en enviarMensaje:', error);
      return errorResponse(res, 'Error interno al enviar el mensaje');
    }
  }

  /**
   * @method obtenerMensajes
   * @description Obtiene los mensajes de un chat de comunidad
   */
  static async obtenerMensajes(req, res) {
    try {
      const { id_red } = req.params;
      const { id_usuario } = req.user;
      const { limite = 50, desde } = req.query;

      // 1. Verificar membresía del usuario
      const esMiembro = await UsuarioRed.findOne({
        where: { id_usuario, id_red }
      });

      if (!esMiembro) {
        return errorResponse(res, 'No tienes acceso a esta comunidad', 403);
      }

      // 2. Construir consulta a Firebase
      let mensajesQuery = db.ref(`chats/${id_red}/mensajes`)
        .orderByChild('fecha_envio');

      if (desde) {
        mensajesQuery = mensajesQuery.startAt(parseInt(desde));
      }

      mensajesQuery = mensajesQuery.limitToLast(parseInt(limite));

      // 3. Obtener mensajes
      const snapshot = await mensajesQuery.once('value');
      const mensajes = snapshot.val() || {};

      // 4. Formatear respuesta
      const mensajesArray = Object.entries(mensajes).map(([id, mensaje]) => ({
        id,
        ...mensaje
      }));

      // Ordenar por fecha (más reciente primero)
      mensajesArray.sort((a, b) => b.fecha_envio - a.fecha_envio);

      return successResponse(res, 'Mensajes obtenidos', {
        mensajes: mensajesArray,
        total: mensajesArray.length
      });

    } catch (error) {
      console.error('Error en obtenerMensajes:', error);
      return errorResponse(res, 'Error al obtener los mensajes');
    }
  }

  /**
   * @method verificarMembresia
   * @description Verifica si un usuario es miembro de una comunidad y genera token de Firebase
   */
  static async verificarMembresia(req, res) {
    try {
      const { id_red } = req.params;
      const { id_usuario } = req.user;

      // 1. Verificar membresía en la base de datos SQL
      const membresia = await UsuarioRed.findOne({ 
        where: { id_usuario, id_red }
      });

      if (!membresia) {
        return errorResponse(res, 'No eres miembro de esta comunidad', 403);
      }

      // 2. Obtener información del usuario para Firebase
      const usuario = await Usuario.findByPk(id_usuario, {
        attributes: ['nombre_usuario', 'apellido_usuario', 'email']
      });

      if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
      }

      // 3. Crear o actualizar usuario en Firebase Auth
      const firebaseUid = `ext_${id_usuario}`;
      
      try {
        await auth.getUser(firebaseUid);
        // Usuario existe, actualizar claims si es necesario
        await auth.setCustomUserClaims(firebaseUid, {
          id_red,
          id_usuario,
          rol: membresia.rol,
          backendAuth: true
        });
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Crear nuevo usuario en Firebase Auth
          await auth.createUser({
            uid: firebaseUid,
            email: usuario.email || `${id_usuario}@qfinder.com`,
            displayName: `${usuario.nombre_usuario} ${usuario.apellido_usuario}`,
            disabled: false
          });

          // Establecer claims
          await auth.setCustomUserClaims(firebaseUid, {
            id_red,
            id_usuario,
            rol: membresia.rol,
            backendAuth: true
          });
        } else {
          throw error;
        }
      }

      // 4. Generar token personalizado de Firebase
      const firebaseToken = await auth.createCustomToken(firebaseUid, {
        id_red,
        id_usuario,
        rol: membresia.rol,
        backendAuth: true
      });

      return successResponse(res, 'Membresía verificada', {
        firebaseToken,
        rol: membresia.rol,
        id_red,
        id_usuario
      });

    } catch (error) {
      console.error('Error en verificarMembresia:', error);
      return errorResponse(res, 'Error al verificar la membresía');
    }
  }

  /**
   * @method enviarNotificacionesPush
   * @description Envía notificaciones push a los miembros de la comunidad (excepto al remitente)
   * @private
   */
  static async enviarNotificacionesPush({ comunidadId, comunidadNombre, mensajeId, mensaje, remitenteId }) {
    try {
      // 1. Obtener todos los miembros de la comunidad excepto el remitente
      const miembros = await UsuarioRed.findAll({
        where: { 
          id_red: comunidadId,
          id_usuario: { [Op.ne]: remitenteId }
        },
        include: [{
          model: Usuario,
          attributes: ['id_usuario', 'fcm_token', 'notificaciones_activas']
        }]
      });

      // 2. Filtrar miembros con FCM token y notificaciones activas
      const miembrosANotificar = miembros.filter(m => 
        m.Usuario.fcm_token && 
        m.Usuario.notificaciones_activas
      );

      if (miembrosANotificar.length === 0) {
        console.log('No hay miembros para notificar');
        return;
      }

      // 3. Preparar mensaje de notificación
      const notification = {
        notification: {
          title: `💬 ${comunidadNombre}`,
          body: mensaje.contenido.length > 100 
            ? `${mensaje.contenido.substring(0, 100)}...` 
            : mensaje.contenido,
          image: mensaje.fotoPerfil || null
        },
        data: {
          type: 'chat',
          comunidadId: comunidadId.toString(),
          mensajeId,
          senderId: remitenteId.toString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'chat_messages'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'mutable-content': 1
            }
          }
        }
      };

      // 4. Enviar notificaciones en lote (hasta 500 por lote)
      const batchSize = 500;
      for (let i = 0; i < miembrosANotificar.length; i += batchSize) {
        const batch = miembrosANotificar.slice(i, i + batchSize);
        const messages = batch.map(miembro => ({
          ...notification,
          token: miembro.Usuario.fcm_token
        }));

        const response = await messaging.sendEach(messages);
        console.log(`Notificaciones enviadas: ${response.successCount}, fallidas: ${response.failureCount}`);

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.error(`Error enviando notificación a ${batch[idx].Usuario.id_usuario}:`, resp.error);
            }
          });
        }
      }

      // 5. Actualizar estado del mensaje en Firebase
      await db.ref(`chats/${comunidadId}/mensajes/${mensajeId}`).update({
        estado: 'notified',
        notificaciones_enviadas: miembrosANotificar.length,
        notificaciones_fallidas: miembros.length - miembrosANotificar.length
      });

    } catch (error) {
      console.error('Error en enviarNotificacionesPush:', error);
      // Intentar marcar el mensaje como fallido
      try {
        await db.ref(`chats/${comunidadId}/mensajes/${mensajeId}`).update({
          estado: 'notification_failed',
          error: error.message
        });
      } catch (dbError) {
        console.error('Error actualizando estado del mensaje:', dbError);
      }
      throw error;
    }
  }

  /**
   * @method setupChatListeners
   * @description Configura listeners para mensajes no notificados (para casos de fallo)
   * @static
   */
  static async setupChatListeners() {
    try {
      console.log('Configurando listeners de chat...');
      
      // Escuchar todas las comunidades
      const comunidadesRef = db.ref('chats');
      
      // Listener para nuevas comunidades
      comunidadesRef.on('child_added', (snapshot) => {
        const comunidadId = snapshot.key;
        this.setupCommunityListener(comunidadId);
      });

      // Configurar listeners para comunidades existentes
      const snapshot = await comunidadesRef.once('value');
      snapshot.forEach(comunidadSnapshot => {
        this.setupCommunityListener(comunidadSnapshot.key);
      });

      console.log('Listeners de chat configurados correctamente');
    } catch (error) {
      console.error('Error configurando listeners de chat:', error);
    }
  }

  /**
   * @method setupCommunityListener
   * @description Configura listener para una comunidad específica
   * @private
   */
  static setupCommunityListener(comunidadId) {
    console.log(`Configurando listener para comunidad ${comunidadId}`);
    
    const mensajesRef = db.ref(`chats/${comunidadId}/mensajes`);
    
    // Escuchar nuevos mensajes que necesiten notificación
    mensajesRef.orderByChild('estado').equalTo('pending_notification').on('child_added', async (snapshot) => {
      const mensaje = snapshot.val();
      
      if (!mensaje) return;
      
      try {
        // Obtener información de la comunidad
        const comunidad = await Red.findByPk(comunidadId, {
          attributes: ['nombre_red']
        });

        // Enviar notificaciones
        await this.enviarNotificacionesPush({
          comunidadId,
          comunidadNombre: comunidad?.nombre_red || 'Comunidad',
          mensajeId: snapshot.key,
          mensaje,
          remitenteId: mensaje.idUsuario
        });

      } catch (error) {
        console.error(`Error procesando mensaje ${snapshot.key} en comunidad ${comunidadId}:`, error);
      }
    });
  }
}

// Inicializar listeners al importar el controlador
ChatController.setupChatListeners().catch(error => {
  console.error('Error inicializando listeners de chat:', error);
});

export default ChatController;