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

    // Verificar membresía del usuario
    const membresia = await UsuarioRed.findOne({ where: { id_usuario, id_red } });
    if (!membresia) {
      return errorResponse(res, 'No tienes permisos para enviar mensajes en esta comunidad', 403);
    }

    // Obtener información del usuario
    const usuario = await Usuario.findByPk(id_usuario, {
      attributes: ['nombre_usuario', 'apellido_usuario']
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Obtener información de la comunidad (red)
    const comunidad = await Red.findByPk(id_red, {
      attributes: ['nombre_red']
    });

    if (!comunidad) {
      return errorResponse(res, 'Comunidad no encontrada', 404);
    }

    const nombreUsuario = `${usuario.nombre_usuario} ${usuario.apellido_usuario}`;
    const fecha_envio = Date.now();

    // Crear objeto de mensaje
    const nuevoMensaje = {
      idUsuario: id_usuario.toString(),
      nombreUsuario,
      contenido: contenido.trim(),
      fecha_envio,
      estado: 'enviado',
      comunidad: comunidad.nombre_red, // Usar el nombre real de la comunidad
      hora: new Date(fecha_envio).toLocaleTimeString()
    };

    // 1. Enviar notificaciones push
    await enviarNotificacionesPush({
      comunidadId: id_red,
      remitenteId: id_usuario,
      mensaje: nuevoMensaje
    });

    // 2. Guardar el mensaje en Firebase
    const mensajeRef = db.ref(`chats/${id_red}/mensajes`).push();
    await mensajeRef.set(nuevoMensaje);
    const mensajeId = mensajeRef.key;

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

    // Verificar membresía
    const esMiembro = await UsuarioRed.findOne({ where: { id_usuario, id_red } });
    if (!esMiembro) {
      return errorResponse(res, 'No tienes acceso a esta comunidad', 403);
    }

    // Obtener mensajes de Firebase
    let mensajesQuery = db.ref(`chats/${id_red}/mensajes`).orderByChild('fecha_envio');
    if (desde) mensajesQuery = mensajesQuery.startAt(parseInt(desde));
    mensajesQuery = mensajesQuery.limitToLast(parseInt(limite));

    const snapshot = await mensajesQuery.once('value');
    const mensajes = snapshot.val() || {};

    // Convertir a array y ordenar
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

    // Verificar membresía
    const membresia = await UsuarioRed.findOne({ where: { id_usuario, id_red } });
    if (!membresia) {
      return errorResponse(res, 'No eres miembro de esta comunidad', 403);
    }

    // Obtener información del usuario
    const usuario = await Usuario.findByPk(id_usuario, {
      attributes: ['nombre_usuario', 'apellido_usuario', 'email']
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Crear o actualizar usuario en Firebase Auth
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

    // Establecer claims personalizados
    await auth.setCustomUserClaims(firebaseUid, {
      id_red,
      id_usuario,
      rol: membresia.rol,
      backendAuth: true
    });

    // Generar token personalizado
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

const enviarNotificacionesPush = async ({ comunidadId, remitenteId, mensaje }) => {
  try {
    // Obtener miembros de la comunidad (excepto el remitente)
    const miembros = await UsuarioRed.findAll({
      where: {
        id_red: comunidadId,
        id_usuario: { [Op.ne]: remitenteId }
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id_usuario', 'fcm_token', 'notificaciones_activas']
      }]
    });

    // Filtrar miembros que pueden recibir notificaciones
    const miembrosANotificar = miembros.filter(m => 
      m.usuario?.fcm_token && m.usuario?.notificaciones_activas
    );

    if (miembrosANotificar.length === 0) return;

    // Obtener nombre de la comunidad
    const comunidad = await Red.findByPk(comunidadId, {
      attributes: ['nombre_red']
    });

    // Preparar payload de notificación
    const notification = {
      notification: {
        title: `💬 ${comunidad.nombre_red}`,
        body: mensaje.contenido.length > 100 
          ? `${mensaje.contenido.substring(0, 100)}...` 
          : mensaje.contenido,
      },
      data: {
        type: 'chat',
        comunidadId: comunidadId.toString(),
        senderId: remitenteId.toString(),
        contenidoPreview: mensaje.contenido.substring(0, 100),
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

    // Enviar notificaciones en lotes
    const batchSize = 500;
    for (let i = 0; i < miembrosANotificar.length; i += batchSize) {
      const batch = miembrosANotificar.slice(i, i + batchSize);
      const messages = batch.map(miembro => ({
        ...notification,
        token: miembro.usuario.fcm_token
      }));

      await messaging.sendEach(messages);
    }

  } catch (error) {
    console.error('Error en enviarNotificacionesPush:', error);
  }
};