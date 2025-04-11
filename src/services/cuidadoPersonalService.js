import CuidadoPersonal from '../models/cuidado_personal.js'; // Ruta correcta

// Registrar un nuevo cuidado personal
export const registrarCuidadoPersonal = async (data) => {
  return await CuidadoPersonal.create(data);
};

// Obtener todos los registros de cuidado personal de un paciente
export const obtenerCuidadosPorPaciente = async (idPaciente) => {
  return await CuidadoPersonal.findAll({
    where: { id_paciente: idPaciente },
    order: [['fecha', 'DESC']]
  });
};
