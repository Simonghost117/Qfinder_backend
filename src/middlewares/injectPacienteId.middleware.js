import Paciente from "../models/paciente.model.js";

export function injectPacienteId(req, res, next) {
    const { id_paciente } = req.params;
    if (id_paciente) {
      req.body.id_paciente = parseInt(id_paciente);
    }
    next();
  }

export const verificarRelacion = async (req, res, next) => {
  try {
    const { id } = req.usuario;
    const { id_paciente } = req.params;
    console.log("ID Paciente:", id_paciente);
    console.log("ID Usuario:", req.usuario);

    const paciente = await Paciente.findByPk(id_paciente);

    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }
    if (paciente.id_usuario !== id) {
      return res.status(403).json({ message: "No tienes permiso para acceder a este paciente" });
    }
    next();
  } catch (error) {
    console.error("Error al verificar la relación:", error);
  }
};