import { buscarRed, unirmeRed, listarRedesPorUsuario } from "../services/usuarioRedService.js";
import UsuarioRed from "../models/UsuarioRed.js";

export const unirseRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Validación de datos requeridos
        if (!id_red || !id_usuario) {
            return res.status(400).json({ msg: "Datos requeridos" });
        }

        // Verificar si la red existe
        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ ok: false, msg: "Red no encontrada" });
        }
        
        // Validar si el usuario ya está en la red
        const usuarioExistente = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });

        if (usuarioExistente) {
            return res.status(400).json({ msg: "El usuario ya está registrado en esta red" });
        }

        // Registrar usuario en la red
        const usuarioRed = await unirmeRed(id_usuario, id_red);
        if (!usuarioRed) {
            return res.status(500).json({ msg: "Error al unirse a la red" });
        }

        return res.status(200).json({
            ok: true,
            msg: "Te has unido a la red correctamente",
            data: usuarioRed
        });

    } catch (error) {
        console.error("Error en unirseRed:", error.message);
        return res.status(500).json({ msg: "Error interno al unirse a la red" });
    }
};

export const listarMembresiaRed = async (req, res) => {
    try {
        const { id_usuario } = req.user;
        if (!id_usuario) {
            return res.status(400).json({ msg: "ID de usuario requerido" });
        }

        const redes = await listarRedesPorUsuario(id_usuario);
        if (!redes || redes.length === 0) {
            return res.status(404).json({ msg: "No estás unido a ninguna red" });
        }

        return res.status(200).json({ ok: true, data: redes });

    } catch (error) {
        console.error("Error en listarMembresiaRed:", error);
        return res.status(500).json({ msg: "Error interno al listar redes" });
    }
};