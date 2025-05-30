import { db, auth, messaging } from '../config/firebase-admin.js';
import Usuario from '../models/usuario.model.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Red from '../models/Red.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { Op } from 'sequelize';

export const enviarMensaje = async (req, res) => {
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
      attributes: ['nombre_usuario', 'apellido_usuario']
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const nombreUsuario = `${usuario.nombre_usuario} ${usuario.apellido_usuario}`;
    const fecha_envio = Date.now();

    const nuevoMensaje = {
      idUsuario: id_usuario.toString(),
      nombreUsuario,
      contenido: contenido.trim(),
      fotoPerfil: usuario.foto_perfil || null,
      fecha_envio,
      estado: 'enviado'
    };

    const mensajeRef = db.ref(`chats/${id_red}/mensajes`).push();
    await mensajeRef.set(nuevoMensaje);
    const mensajeId = mensajeRef.key;

    // Enviar notificaciones push
    await enviarNotificacionesPush({
      comunidadId: id_red,
      remitenteId: id_usuario,
      mensajeId,
      mensaje: nuevoMensaje
    });

    return successResponse(res, 'Mensaje enviado correctamente', {
      idMensaje: mensajeId,
      ...nuevoMensaje
    });

  } catch (error) {
    console.error('Error en enviarMensaje:', error);
    return errorResponse(res, 'Error interno al enviar el mensaje');
  }
};

export const obtenerMensajes = async (req, res) => {
  try {
    const { id_red } = req.params;
    const { id_usuario } = req.user;
    const { limite = 50, desde } = req.query;

    const esMiembro = await UsuarioRed.findOne({ where: { id_usuario, id_red } });
    if (!esMiembro) {
      return errorResponse(res, 'No tienes acceso a esta comunidad', 403);
    }

    let mensajesQuery = db.ref(`chats/${id_red}/mensajes`).orderByChild('fecha_envio');
    if (desde) mensajesQuery = mensajesQuery.startAt(parseInt(desde));
    mensajesQuery = mensajesQuery.limitToLast(parseInt(limite));

    const snapshot = await mensajesQuery.once('value');
    const mensajes = snapshot.val() || {};

    const mensajesArray = Object.keys(mensajes).map(id => ({
      id,
      ...mensajes[id]
    }));

    mensajesArray.sort((a, b) => a.fecha_envio - b.fecha_envio);

    return successResponse(res, 'Mensajes obtenidos', {
      success: true,
      mensajes: mensajesArray
    });

  } catch (error) {
    console.error('Error en obtenerMensajes:', error);
    return errorResponse(res, 'Error al obtener los mensajes');
  }
};

export const verificarMembresia = async (req, res) => {
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
    let userRecord;

    try {
      userRecord = await auth.getUser(firebaseUid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          uid: firebaseUid,
          email: usuario.email || `${id_usuario}@qfinder.com`,
          displayName: `${usuario.nombre_usuario} ${usuario.apellido_usuario}`,
          disabled: false
        });
      } else {
        throw error;
      }
    }

    await auth.setCustomUserClaims(firebaseUid, {
      id_red,
      id_usuario,
      rol: membresia.rol,
      backendAuth: true
    });

    const firebaseToken = await auth.createCustomToken(firebaseUid, {
      id_red,
      id_usuario,
      rol: membresia.rol,
      backendAuth: true
    });

    return successResponse(res, 'Membresía verificada', {
      success: true,
      firebaseToken,
      id_red,
      id_usuario,
      rol: membresia.rol
    });

  } catch (error) {
    console.error('Error en verificarMembresia:', error);
    return errorResponse(res, 'Error al verificar la membresía');
  }
};

const enviarNotificacionesPush = async ({ comunidadId, remitenteId, mensajeId, mensaje }) => {
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

    if (miembrosANotificar.length === 0) return;

    const comunidad = await Red.findByPk(comunidadId, {
      attributes: ['nombre_red']
    });

    const notification = {
      notification: {
        title: `💬 ${comunidad.nombre_red}`,
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
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'chat_messages'
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

      await messaging.sendEach(messages);
    }

    await db.ref(`chats/${comunidadId}/mensajes/${mensajeId}`).update({
      notificaciones_enviadas: miembrosANotificar.length
    });

  } catch (error) {
    console.error('Error en enviarNotificacionesPush:', error);
  }
};