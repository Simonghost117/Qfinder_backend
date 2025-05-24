import { db } from '../config/firebase-admin.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Usuario from '../models/usuario.model.js';
import Red from '../models/Red.js';
import { buscarRed, unirmeRed, listarRedesPorUsuario, listarMembresia } from "../services/usuarioRedService.js";

// Función optimizada para verificar membresía

export const verificarMembresia = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Verificar en ambas bases de datos
        const [sqlMembership, firebaseMembership] = await Promise.all([
            UsuarioRed.findOne({ where: { id_usuario, id_red } }),
            db.ref(`chats/${id_red}/miembros/${id_usuario}`).once('value')
        ]);

        // Sincronizar si hay discrepancia
        if (sqlMembership && !firebaseMembership.exists()) {
            await db.ref(`chats/${id_red}/miembros/${id_usuario}`).set({
                rol: sqlMembership.rol,
                fecha_union: sqlMembership.fecha_union.getTime()
            });
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

// Función optimizada para unirse a red
export const unirseRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // 1. Verificar y crear en SQL
        const [membresia, creado] = await UsuarioRed.findOrCreate({
            where: { id_usuario, id_red },
            defaults: { rol: 'miembro', fecha_union: new Date() }
        });

        if (!creado) {
            return res.status(400).json({ msg: "El usuario ya está en esta red" });
        }

        // 2. Sincronizar con Firebase
        await db.ref(`chats/${id_red}/miembros/ext_${id_usuario}`).set({
            rol: 'miembro',
            ultima_sincronizacion: Date.now()
        });

        return res.status(200).json({
            success: true,
            data: membresia
        });
    } catch (error) {
        console.error("Error en unirseRed:", error);
        return res.status(500).json({ 
            success: false,
            error: "Error interno del servidor"
        });
    }
};

export const obtenerRedYEstadoUnion = async (req, res) => {
    try {
        const { nombre } = req.query;
        const id_usuario = req.user.id_usuario;

        // Busca la red por nombre
        const red = await Red.findOne({ where: { nombre_red: nombre } });
        if (!red) {
            return res.status(404).json({ success: false, message: 'Red no encontrada' });
        }

        // Verifica si el usuario es miembro de la red
        const membresia = await UsuarioRed.findOne({
            where: {
                id_usuario,
                id_red: red.id_red
            }
        });

        return res.json({
            id_red: red.id_red,
            nombre_red: red.nombre_red,
            descripcion_red: red.descripcion_red,
            success: true,
            message: "OK",
            unido: !!membresia
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const redesPertenecientes = async (req, res) => {
    try {
        const { id_usuario } = req.user;
        
        // Consulta optimizada para obtener las redes del usuario
        const membresias = await UsuarioRed.findAll({
            where: { id_usuario },
            include: [{
                model: Red,
                as: 'red',
                attributes: ['id_red', 'nombre_red', 'descripcion_red']
            }]
        });

        const redesResponse = membresias.map(membresia => ({
            id_red: membresia.red.id_red,
            nombre_red: membresia.red.nombre_red,
            descripcion_red: membresia.red.descripcion_red,
            unido: true,
            rol: membresia.rol
        }));

        // Sincronización con Firebase en segundo plano
        sincronizarRedesConFirebase(id_usuario, redesResponse);

        res.json({ success: true, data: redesResponse });
    } catch (error) {
        console.error("Error en redesPertenecientes:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Función auxiliar para sincronizar redes con Firebase
async function sincronizarRedesConFirebase(id_usuario, redes) {
    try {
        const updates = {};
        const timestamp = Date.now();
        
        redes.forEach(red => {
            updates[`comunidades/${red.id_red}/miembros/ext_${id_usuario}`] = {
                rol: red.rol || 'miembro',
                ultima_sincronizacion: timestamp
            };
        });

        await db.ref().update(updates);
    } catch (error) {
        console.error("Error en sincronización Firebase:", error);
    }
}

export const listarMembresiaRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        if (!id_red) {
            return res.status(400).json({ error: "Id_red requerida" });
        }

        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ error: "Red no encontrada" });
        }

        const membresia = await listarMembresia(id_red);
        if (!membresia || membresia.length === 0) {
            return res.status(404).json({ error: "Esta red no tiene usuarios" });
        }

        return res.status(200).json({ 
            success: true,
            message: "Lista de usuarios",
            data: membresia
        });

    } catch (error) {
        console.error("Error al listar la membresia", error);
        return res.status(500).json({ 
            error: "Error interno al listar la membresia", 
            details: error.message 
        });
    }
};

export const abandonarRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        if (!id_red || !id_usuario) {
            return res.status(400).json({ error: "Datos requeridos" });
        }

        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ error: "Red no encontrada" });
        }

        const usuario = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });
        
        if (!usuario) {
            return res.status(404).json({ error: "El usuario no pertenece a la red" });
        }
        
        // Eliminar de SQL
        await UsuarioRed.destroy({
            where: { id_usuario, id_red }
        });

        // Eliminar de Firebase
        await db.ref(`comunidades/${id_red}/miembros/ext_${id_usuario}`).remove();

        return res.status(200).json({
            success: true,
            message: "Usuario eliminado de la red"
        });
    } catch (error) {
        console.error('Error al abandonar red:', error);
        return res.status(500).json({ 
            error: "Error interno al abandonar red",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const asignarAdmin = async (req, res) => {
    try {
        const { id_red, id_miembro } = req.params;

        if (!id_red || !id_miembro) {
            return res.status(400).json({ 
                success: false,
                error: "Se requieren ID de red y ID de miembro" 
            });
        }

        const membresia = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            }
        });

        if (!membresia) {
            return res.status(404).json({ 
                success: false,
                error: "El usuario no es miembro de esta red" 
            });
        }

        // Actualizar el rol en SQL
        const [updated] = await UsuarioRed.update(
            { rol: 'administrador' },
            {
                where: {
                    id_usuario: id_miembro,
                    id_red: id_red
                },
                returning: true
            }
        );

        if (updated === 0) {
            return res.status(404).json({
                success: false,
                error: "No se pudo actualizar el rol"
            });
        }

        // Actualizar el rol en Firebase
        await db.ref(`comunidades/${id_red}/miembros/ext_${id_miembro}`).update({
            rol: 'administrador'
        });

        // Obtener datos actualizados para la respuesta
        const resultado = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            },
            attributes: ['id_usuario', 'id_red', 'rol', 'fecha_union'],
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ['nombre_usuario', 'apellido_usuario']
                }
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Usuario promovido a administrador correctamente",
            data: resultado
        });

    } catch (error) {
        console.error('Error en asignarAdmin:', error);
        return res.status(500).json({ 
            success: false,
            error: "Error interno del servidor",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const eliminarMiembro = async (req, res) => {
    try {
        const { id_red, id_miembro } = req.params;
        if (!id_red || !id_miembro) {
            return res.status(400).json({ error: "Datos requeridos" });
        }

        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ error: "Red no encontrada" });
        }

        const miembro = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            }
        });
        
        if (!miembro) {
            return res.status(404).json({ error: "El usuario no es miembro de esta red" });
        }
        
        // Eliminar de SQL
        await UsuarioRed.destroy({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            }
        });
        
        // Eliminar de Firebase
        await db.ref(`comunidades/${id_red}/miembros/ext_${id_miembro}`).remove();

        return res.status(200).json({
            success: true,
            message: "Miembro eliminado de la red"
        });

    } catch (error) {
        console.error('Error interno al eliminar miembro:', error);
        return res.status(500).json({
            error: "Error interno al eliminar miembro",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};