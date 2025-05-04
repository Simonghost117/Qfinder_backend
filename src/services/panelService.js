import  Paciente  from '../models/paciente.model.js'; // Importa solo una vez
import CitaMedica from '../models/cita_medica.js';
import PanelPersonalizado from '../models/panel_personalizado.js';


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
