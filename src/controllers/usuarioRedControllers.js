import { db } from '../config/firebase-admin.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Usuario from '../models/usuario.model.js';
import Red from '../models/Red.js';

// Función optimizada para verificar membresía
export const verificarMembresia = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Validación rápida con caché implícito de Sequelize
        const membresia = await UsuarioRed.findOne({
            where: { id_usuario, id_red },
            attributes: ['id_usuario', 'id_red', 'rol'],
            raw: true
        });

        if (!membresia) {
            return res.status(403).json({ 
                success: false,
                message: 'No eres miembro de esta red' 
            });
        }

        // Respuesta rápida, sincronización en segundo plano
        res.json({ 
            success: true,
            data: membresia
        });

        // Sincronización con Firebase (no bloqueante)
        sincronizarFirebaseMembresia(id_red, id_usuario, membresia.rol);

    } catch (error) {
        console.error("Error en verificarMembresia:", error);
        res.status(500).json({ 
            success: false,
            message: 'Error al verificar membresía'
        });
    }
};

// Función optimizada para unirse a red
export const unirseRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Verificar si la red existe
        const red = await Red.findByPk(id_red);
        if (!red) {
            return res.status(404).json({ ok: false, msg: "Red no encontrada" });
        }
        
        // Verificar membresía existente
        const [membresia, creado] = await UsuarioRed.findOrCreate({
            where: { id_usuario, id_red },
            defaults: {
                rol: 'miembro',
                fecha_union: new Date()
            }
        });

        if (!creado) {
            return res.status(400).json({ msg: "El usuario ya está registrado en esta red" });
        }

        // Sincronización con Firebase
        await db.ref(`comunidades/${id_red}/miembros/ext_${id_usuario}`).set({
            rol: 'miembro',
            fecha_union: Date.now()
        });

        return res.status(200).json({
            ok: true,
            msg: "Te has unido a la red correctamente",
            data: membresia
        });

    } catch (error) {
        console.error("Error en unirseRed:", error.message);
        return res.status(500).json({ msg: "Error interno al unirse a la red" });
    }
};

// Función auxiliar para sincronización con Firebase
async function sincronizarFirebaseMembresia(id_red, id_usuario, rol) {
    try {
        await db.ref(`comunidades/${id_red}/miembros/ext_${id_usuario}`).update({
            rol,
            ultima_sincronizacion: Date.now()
        });
    } catch (error) {
        console.error("Error sincronizando con Firebase:", error);
    }
}