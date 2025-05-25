import { auth, db } from '../config/firebase-admin.js';
import { models } from '../models/index.js';
const { UsuarioRed, Red, Usuario } = models;

export const enviarMensaje = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;
        const { contenido } = req.body;

        // Verificar que el usuario es miembro de la red
        const membresia = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });

        if (!membresia) {
            return res.status(403).json({ 
                success: false,
                message: 'No eres miembro de esta red' 
            });
        }

        // Obtener datos del usuario
        const usuario = await Usuario.findByPk(id_usuario, {
            attributes: ['nombre_usuario', 'apellido_usuario']
        });

        if (!usuario) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        const nombreUsuario = `${usuario.nombre_usuario} ${usuario.apellido_usuario}`;

        // Crear mensaje en Firebase
        const nuevoMensaje = {
            idUsuario: id_usuario.toString(),
            nombreUsuario,
            contenido,
            fecha_envio: Date.now(),
            estado: 'enviado'
        };

        const mensajeRef = db.ref(`chats/${id_red}/mensajes`).push();
        await mensajeRef.set(nuevoMensaje);

        res.status(201).json({
            success: true,
            message: 'Mensaje enviado',
            idMensaje: mensajeRef.key
        });

    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno al enviar mensaje'
        });
    }
};

export const obtenerMensajes = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;
        const { limite = 50 } = req.query;

        // Verificar membresía
        const esMiembro = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });

        if (!esMiembro) {
            return res.status(403).json({ 
                success: false,
                error: 'No eres miembro de esta red' 
            });
        }

        const snapshot = await db.ref(`chats/${id_red}/mensajes`)
            .orderByChild('fecha_envio')
            .limitToLast(parseInt(limite))
            .once('value');

        const mensajes = snapshot.val() || {};

        res.status(200).json({
            success: true,
            data: Object.values(mensajes)
        });
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener mensajes'
        });
    }
};

export const verificarMembresia = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Verificar en SQL
        const membresia = await UsuarioRed.findOne({ 
            where: { id_usuario, id_red }
        });

        if (!membresia) {
            return res.status(200).json({ 
                success: false,
                message: 'No eres miembro de esta red'
            });
        }

        // Generar token Firebase para el chat
        const firebaseToken = await auth.createCustomToken(`ext_${id_usuario}`, {
            id_red,
            id_usuario,
            rol: membresia.rol,
            backendAuth: true
        });

        res.status(200).json({ 
            success: true,
            message: 'Miembro verificado',
            firebaseToken
        });
    } catch (error) {
        console.error('Error en verificarMembresia:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
};