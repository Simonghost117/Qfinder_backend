import Medico from "../models/Medico.js";
import Usuario from "../models/usuario.model.js";

export const listarMedicos = async (req, res) => {
    try {
        const medicos = await Medico.findAll({
            include: {
                model: Usuario,
                attributes: [
                    "nombre_usuario", "apellido_usuario", "correo_usuario"],
            },
        });
        res.status(200).json(medicos);
    } catch (error) {
        res.status(500).json({ error: "Error al listar los médicos" });
    }
}