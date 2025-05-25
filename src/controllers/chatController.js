import { auth, db } from '../config/firebase-admin.js';
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

        // Validación más estricta
        if (!contenido || !idUsuario || !nombreUsuario) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos son requeridos',
                detalles: {
                    contenido: !!contenido,
                    idUsuario: !!idUsuario,
                    nombreUsuario: !!nombreUsuario
                }
            });
        }

        // Verificar que el idUsuario coincida con el usuario autenticado
        if (idUsuario !== id_usuario.toString()) {
            return res.status(403).json({
                success: false,
                error: 'No autorizado: ID de usuario no coincide'
            });
        }

        // Crear mensaje en Firebase
        const nuevoMensaje = {
            contenido,
            idUsuario,
            nombreUsuario,
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

        // Verificar en ambas bases de datos
        const [sqlMembership, firebaseMembership] = await Promise.all([
            UsuarioRed.findOne({ where: { id_usuario, id_red } }),
            db.ref(`comunidades/${id_red}/miembros/ext_${id_usuario}`).once('value')
        ]);

        // Sincronizar si hay discrepancia
        if (sqlMembership && !firebaseMembership.exists()) {
            await db.ref(`comunidades/${id_red}/miembros/ext_${id_usuario}`).set({
                rol: sqlMembership.rol,
                ultima_sincronizacion: Date.now()
            });
            return res.status(200).json({ success: true, message: 'Miembro verificado' });
        }

        if (!sqlMembership && firebaseMembership.exists()) {
            // Crear en SQL si existe en Firebase pero no en SQL
            await UsuarioRed.create({
                id_usuario,
                id_red,
                rol: firebaseMembership.val().rol || 'miembro',
                fecha_union: new Date(firebaseMembership.val().fecha_union || Date.now())
            });
            return res.status(200).json({ success: true, message: 'Miembro verificado' });
        }

        return res.status(200).json({ 
            success: !!sqlMembership,
            message: sqlMembership ? 'Miembro verificado' : 'No eres miembro'
        });
    } catch (error) {
        console.error('Error en verificarMembresia:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
};