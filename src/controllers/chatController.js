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
    const mensajeId = `msg_${fecha_envio}_${Math.random().toString(36).substr(2, 8)}`;

    // Crear objeto de mensaje
    const nuevoMensaje = {
      id: mensajeId,
      idUsuario: id_usuario.toString(),
      nombreUsuario,
      contenido: contenido.trim(),
      fecha_envio,
      estado: 'enviado',
      comunidad: comunidad.nombre_red,
      hora: new Date(fecha_envio).toLocaleTimeString()
    };

    // 1. Guardar el mensaje en Firebase con transacción para evitar duplicados
    const mensajeRef = db.ref(`chats/${id_red}/mensajes/${mensajeId}`);
    
    await mensajeRef.transaction((currentData) => {
      if (currentData === null) {
        return nuevoMensaje;
      }
      return; // Abortar si ya existe
    });

    // 2. Enviar notificaciones (solo si se creó el mensaje)
    const snapshot = await mensajeRef.once('value');
    if (snapshot.exists()) {
      await enviarNotificacionesPush({
        comunidadId: id_red,
        remitenteId: id_usuario,
        mensaje: nuevoMensaje
      });
    }

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
    // Verificar si ya se notificó este mensaje
    const notificacionesRef = db.ref(`notificaciones_enviadas/${comunidadId}/${mensaje.id}`);
    const snapshotNotif = await notificacionesRef.once('value');
    
    if (snapshotNotif.exists()) {
      console.log(`Notificación para mensaje ${mensaje.id} ya fue enviada`);
      return;
    }

    // Marcar como notificado
    await notificacionesRef.set(true);

    // Obtener miembros con tokens válidos
    const miembros = await UsuarioRed.findAll({
      where: {
        id_red: comunidadId,
        id_usuario: { [Op.ne]: remitenteId }
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

    if (miembros.length === 0) return;

    // Obtener nombre de la comunidad
    const comunidad = await Red.findByPk(comunidadId, {
      attributes: ['nombre_red']
    });

    // Preparar notificación
    const message = {
      notification: {
        title: `💬 ${comunidad.nombre_red}`,
        body: mensaje.contenido.length > 100 
          ? `${mensaje.contenido.substring(0, 100)}...` 
          : mensaje.contenido
      },
      data: {
        type: 'chat',
        comunidadId: comunidadId.toString(),
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

    // Enviar notificaciones en lotes
    const batchSize = 500;
    const tokens = miembros.map(m => m.usuario.fcm_token).filter(t => t);
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      // Usar sendMulticast para mejor manejo de errores
      const response = await messaging.sendMulticast({
        ...message,
        tokens: batch
      });

      // Manejar respuestas fallidas
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Error enviando a token ${batch[idx]}:`, resp.error);
          // Opcional: Eliminar token inválido de la base de datos
        }
      });
    }

  } catch (error) {
    console.error('Error en enviarNotificacionesPush:', error);
    // Manejar específicamente el error de credenciales
    if (error.code === 'messaging/mismatched-credential') {
      console.error('ERROR CRÍTICO: Las credenciales de Firebase no coinciden');
      // Aquí podrías notificar a los administradores
    }
  }
};