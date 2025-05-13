import CuidadoPersonal from '../models/cuidado_personal.js'; // Ruta correcta

// Registrar un nuevo cuidado personal
export const registrarCuidadoPersonal = async (data) => {
  const registro = await CuidadoPersonal.create(data);
  if (!registro) {
    throw new Error('Error al registrar el cuidado personal');
  }
  return registro;
};

// Obtener todos los registros de cuidado personal de un paciente
export const obtenerCuidadosPorPaciente = async (idPaciente) => {
  return await CuidadoPersonal.findAll({
    where: { id_paciente: idPaciente
     },
    order: [['fecha', 'DESC']]
  });
};

export const actualizarCuidadoPersonal = async (idPaciente, idCuidado, data) => {
  return await CuidadoPersonal.update(data, {
    where: { id_paciente: idPaciente,
      id_registro: idCuidado }
  });
}

export const eliminarCuidadoPersonal = async (idPaciente, idCuidado) => {
  return await CuidadoPersonal.destroy({
    where: {
      id_paciente: idPaciente,
      id_registro: idCuidado
    }
  });
}
export const obtenerCuidadoId = async (idPaciente, idCuidado) => {
  return await CuidadoPersonal.findOne({
    where: {
      id_paciente: idPaciente,
      id_registro: idCuidado
    }
  });
}