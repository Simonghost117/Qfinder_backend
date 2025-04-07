import db from '../models/index.js';

const { Paciente, CitaMedica, PanelPersonalizado } = db;

export const obtenerPanelMedico = async (idPaciente) => {
  return await Paciente.findOne({
    where: { id_paciente: idPaciente },
    attributes: ['id_paciente', 'nombre', 'apellido', 'diagnostico_principal'],
    include: [
      {
        model: CitaMedica,
        attributes: ['fecha_cita', 'resultado_consulta'],
        required: false
      },
      {
        model: PanelPersonalizado,
        attributes: ['plan_tratamiento', 'terapia_recomendada'],
        required: false
      }
    ]
  });
};
