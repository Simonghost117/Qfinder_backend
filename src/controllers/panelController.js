import { obtenerPanelMedico } from '../services/panelService.js';

export const getPanelPaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const data = await obtenerPanelMedico(idPaciente);

    if (!data) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    res.status(200).json({
      id_paciente: data.id_paciente,
      nombre: data.nombre,
      apellido: data.apellido,
      enfermedades_cronicas: data.diagnostico_principal,
      diagnosticos_previos: data.CitaMedicas?.map(c => ({
        fecha: c.fecha_cita,
        resultado: c.resultado_consulta
      })) || [],
      tratamientos_en_curso: data.PanelPersonalizados?.map(p => p.plan_tratamiento) || [],
      alergias_y_antecedentes: data.PanelPersonalizados?.map(p => p.terapia_recomendada) || []
    });
  } catch (error) {
    console.error('Error al obtener el panel:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
