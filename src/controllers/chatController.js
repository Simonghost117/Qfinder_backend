import { db } from '../config/firebase-admin.js';
import { models } from '../models/index.js';
const { UsuarioRed, Red } = models;
import { Op } from 'sequelize';

export const obtenerIdRedPorNombre = async (req, res) => {
    try {
        const { nombre } = req.query;

        if (!nombre) {
            return res.status(400).json({ 
                success: false,
                message: 'El parámetro nombre es requerido' 
            });
        }

        // Búsqueda case-insensitive y con trim
        const red = await Red.findOne({
            where: { 
                nombre_red: {
                    [Op.iLike]: `%${nombre.trim()}%`
                }
            },
            attributes: ['id_red', 'nombre_red']
        });

        if (!red) {
            return res.status(404).json({ 
                success: false,
                message: 'Red no encontrada' 
            });
        }

        res.status(200).json({
            success: true,
            id_red: red.id_red,
            nombre_red: red.nombre_red
        });

    } catch (error) {
        console.error('Error al obtener ID de red:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener ID de red',
            details: error.message
        });
    }
};

export const enviarMensaje = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;
        const { contenido, idUsuario, nombreUsuario } = req.body;

        // Validación rápida
        if (!contenido || !idUsuario || !nombreUsuario) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos son requeridos' 
            });
        }

        // Verificación de membresía optimizada
        const [esMiembro, red] = await Promise.all([
            UsuarioRed.findOne({ where: { id_usuario, id_red } }),
            Red.findByPk(id_red)
        ]);

        if (!esMiembro || !red) {
            return res.status(403).json({ 
                success: false,
                error: 'No eres miembro de esta red o la red no existe' 
            });
        }

        // Crear mensaje en Firebase primero (más rápido)
        const chatRef = db.ref(`chats/${id_red}/mensajes`).push();
        const nuevoMensaje = {
            id: chatRef.key,
            contenido,
            idUsuario,
            nombreUsuario,
            fecha_envio: Date.now()
        };

        await chatRef.set(nuevoMensaje);

        // Responder inmediatamente
        res.status(201).json({ 
            success: true, 
            message: 'Mensaje enviado',
            data: nuevoMensaje
        });

    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al enviar mensaje',
            details: error.message
        });
    }
};

export const obtenerMensajes = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { limite = 50 } = req.query;

        // Verificar membresía
        const esMiembro = await UsuarioRed.findOne({
            where: { id_usuario: req.user.id_usuario, id_red }
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
            error: 'Error al obtener mensajes',
            details: error.message
        });
    }
};
export const verificarMembresia = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // 1. Verificar en SQL
        const sqlMembership = await UsuarioRed.findOne({ 
            where: { id_usuario, id_red }
        });

        // 2. Generar token Firebase si es miembro
        if (sqlMembership) {
            const firebaseToken = await auth.createCustomToken(`ext_${id_usuario}`, {
                id_red,
                id_usuario,
                rol: sqlMembership.rol,
                backendAuth: true
            });

            return res.status(200).json({ 
                success: true,
                message: 'Miembro verificado',
                firebaseToken
            });
        }

        return res.status(200).json({ 
            success: false,
            message: 'No eres miembro'
        });
    } catch (error) {
        console.error('Error en verificarMembresia:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
};