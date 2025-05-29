import { db, auth, messaging } from '../config/firebase-admin.js';
import Usuario from '../models/usuario.model.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Red from '../models/Red.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { Op } from 'sequelize';

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

      if (!contenido || contenido.trim().length === 0) {
        return errorResponse(res, 'El contenido del mensaje no puede estar vacío', 400);
      }

      const membresia = await UsuarioRed.findOne({ where: { id_usuario, id_red } });

      if (!membresia) {
        return errorResponse(res, 'No tienes permisos para enviar mensajes en esta comunidad', 403);
      }

      const usuario = await Usuario.findByPk(id_usuario, {
        attributes: ['nombre_usuario', 'apellido_usuario', 'foto_perfil']
      });

      if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
      }

      const nombreUsuario = `${usuario.nombre_usuario} ${usuario.apellido_usuario}`;

      const nuevoMensaje = {
        idUsuario: id_usuario.toString(),
        nombreUsuario,
        contenido: contenido.trim(),
        fotoPerfil: usuario.foto_perfil || null,
        fecha_envio: Date.now(),
        estado: 'pending_notification'
      };

      const mensajeRef = db.ref(`chats/${id_red}/mensajes`).push();
      await mensajeRef.set(nuevoMensaje);

      const comunidad = await Red.findByPk(id_red, {
        attributes: ['nombre_red']
      });

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

      const esMiembro = await UsuarioRed.findOne({
        where: { id_usuario, id_red }
      });

      if (!esMiembro) {
        return errorResponse(res, 'No tienes acceso a esta comunidad', 403);
      }

      let mensajesQuery = db.ref(`chats/${id_red}/mensajes`).orderByChild('fecha_envio');
      if (desde) mensajesQuery = mensajesQuery.startAt(parseInt(desde));
      mensajesQuery = mensajesQuery.limitToLast(parseInt(limite));

      const snapshot = await mensajesQuery.once('value');
      const mensajes = snapshot.val() || {};

      const mensajesArray = Object.entries(mensajes).map(([id, mensaje]) => ({
        id,
        ...mensaje
      }));

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

      const membresia = await UsuarioRed.findOne({ where: { id_usuario, id_red } });

      if (!membresia) {
        return errorResponse(res, 'No eres miembro de esta comunidad', 403);
      }

      const usuario = await Usuario.findByPk(id_usuario, {
        attributes: ['nombre_usuario', 'apellido_usuario', 'email']
      });

      if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
      }

      const firebaseUid = `ext_${id_usuario}`;

      try {
        await auth.getUser(firebaseUid);
        await auth.setCustomUserClaims(firebaseUid, {
          id_red,
          id_usuario,
          rol: membresia.rol,
          backendAuth: true
        });
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          await auth.createUser({
            uid: firebaseUid,
            email: usuario.email || `${id_usuario}@qfinder.com`,
            displayName: `${usuario.nombre_usuario} ${usuario.apellido_usuario}`,
            disabled: false
          });

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

      const miembrosANotificar = miembros.filter(m =>
        m.Usuario?.fcm_token && m.Usuario?.notificaciones_activas
      );

      if (miembrosANotificar.length === 0) {
        console.log('No hay miembros para notificar');
        return;
      }

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

      await db.ref(`chats/${comunidadId}/mensajes/${mensajeId}`).update({
        estado: 'notified',
        notificaciones_enviadas: miembrosANotificar.length
      });

    } catch (error) {
      console.error('Error en enviarNotificacionesPush:', error);
      try {
        await db.ref(`chats/${comunidadId}/mensajes/${mensajeId}`).update({
          estado: 'notification_failed'
        });
      } catch (innerError) {
        console.error('Error al actualizar el estado del mensaje tras fallo de notificación:', innerError);
      }
    }
  }
}

export default ChatController;
