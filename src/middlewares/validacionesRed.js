import { db } from '../config/firebase-admin.js';
import { models } from '../models/index.js';
const { UsuarioRed, Usuario } = models;
import { 
    buscarRed, 
    unirmeRed, 
    listarRedesPorUsuario, 
    listarMembresia 
} from "../services/usuarioRedService.js";

// Middlewares de verificación
export const esAdministradorRed = async (req, res, next) => {
    try {
        const { id_usuario } = req.user; 
        const { id_red } = req.params; 

        // Buscar la membresía del usuario en la red (SQL)
        const membresia = await UsuarioRed.findOne({
            where: {
                id_usuario,
                id_red
            }
        });

        // Verificar si el usuario es administrador
        if (!membresia || membresia.rol !== 'administrador') {
            console.log('Acceso denegado: El usuario no es administrador de la red');
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requieren privilegios de administrador'
            });
        }

        // Si es administrador, continuar
        next();
    } catch (error) {
        console.error('Error en middleware esAdministradorRed:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar permisos de administrador'
        });
    }
};

export const esMiembroRed = async (req, res, next) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Verificación en ambas bases de datos
        const [firebaseMember, sqlMember] = await Promise.all([
            db.ref(`chats/${id_red}/miembros/${id_usuario}`).once('value'),
            UsuarioRed.findOne({ where: { id_usuario, id_red } })
        ]);

        if (!firebaseMember.exists() && !sqlMember) {
            return res.status(403).json({ 
                success: false,
                error: 'No eres miembro de esta red' 
            });
        }

        // Sincronizar si hay discrepancia
        if (firebaseMember.exists() && !sqlMember) {
            await UsuarioRed.create({
                id_usuario,
                id_red,
                rol: 'miembro',
                fecha_union: new Date()
            });
        } else if (!firebaseMember.exists() && sqlMember) {
            await db.ref(`chats/${id_red}/miembros/${id_usuario}`).set({
                rol: sqlMember.rol,
                fecha_union: sqlMember.fecha_union.getTime()
            });
        }

        next();
    } catch (error) {
        console.error('Error en validación de membresía:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al verificar membresía' 
        });
    }
};

// Controladores
export const unirseRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        if (!id_red || !id_usuario) {
            return res.status(400).json({ 
                success: false,
                msg: "Datos requeridos" 
            });
        }

        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ 
                success: false,
                msg: "Red no encontrada" 
            });
        }
        
        const usuarioExistente = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });

        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false,
                msg: "El usuario ya está registrado en esta red" 
            });
        }

        // Registrar en SQL
        const usuarioRed = await unirmeRed(id_usuario, id_red);
        if (!usuarioRed) {
            return res.status(500).json({ 
                success: false,
                msg: "Error al unirse a la red" 
            });
        }

        // Registrar en Firebase
        await db.ref(`comunidades/${id_red}/miembros/${id_usuario}`).set({
            rol: 'miembro',
            fecha_union: Date.now()
        });

        return res.status(200).json({
            success: true,
            msg: "Te has unido a la red correctamente",
            data: usuarioRed
        });

    } catch (error) {
        console.error("Error en unirseRed:", error.message);
        return res.status(500).json({ 
            success: false,
            msg: "Error interno al unirse a la red" 
        });
    }
};

export const abandonarRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        if(!id_red || !id_usuario) {
            return res.status(400).json({ 
                success: false,
                error: "Datos requeridos"
            });
        }

        const red = await buscarRed(id_red);
        if(!red) {
            return res.status(404).json({ 
                success: false,
                error: "Red no encontrada"
            });
        }

        const usuario = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });
        
        if(!usuario) {
            return res.status(404).json({ 
                success: false,
                error: "El usuario no pertenece a la red"
            });
        }
        
        // Eliminar de SQL
        await UsuarioRed.destroy({
            where: { id_usuario, id_red }
        });

        // Eliminar de Firebase
        await db.ref(`comunidades/${id_red}/miembros/${id_usuario}`).remove();

        return res.status(200).json({
            success: true,
            message: "Usuario eliminado de la red"
        });
    } catch (error) {
        console.error('Error al abandonar red:', error);
        return res.status(500).json({ 
            success: false,
            error: "Error interno al abandonar red"
        });
    }
};

// ... (otros controladores como redesPertenecientes, listarMembresiaRed, asignarAdmin, eliminarMiembro)