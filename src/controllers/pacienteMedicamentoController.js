import PacienteMedicamento from '../models/pacienteMedicamento.model.js';
import Paciente from '../models/paciente.model.js';
import Medicamento from '../models/medicamento.model.js';

export const asignarMedicamento = async (req, res) => {
  try {
    const { id_paciente, id_medicamento, fecha_inicio, fecha_fin, dosis, frecuencia } = req.body;
    const nuevo = await PacienteMedicamento.create({ id_paciente, id_medicamento, fecha_inicio, fecha_fin, dosis, frecuencia });
    res.status(201).json({ success: true, data: nuevo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al asignar medicamento', error: error.message });
  }
};

export const listarMedicamentosPorPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const { id_usuario } = req.user;

    // Verificar que el paciente pertenece al usuario
    const paciente = await Paciente.findOne({
      where: {
        id_paciente,
        id_usuario
      }
    });

    if (!paciente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Paciente no encontrado o no pertenece al usuario' 
      });
    }

    const medicamentos = await PacienteMedicamento.findAll({
      where: { id_paciente },
      include: [
        {
          model: Medicamento,
          attributes: ['id_medicamento', 'nombre', 'descripcion'] // Puedes incluir más atributos si necesitas
        }
      ],
      attributes: ['id_pac_medicamento', 'fecha_inicio', 'fecha_fin', 'dosis', 'frecuencia']
    });

    res.status(200).json({ 
      success: true, 
      data: {
        paciente: {
          id_paciente: paciente.id_paciente,
          nombre: paciente.nombre,
          apellido: paciente.apellido
        },
        medicamentos
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al listar medicamentos del paciente', 
      error: error.message 
    });
  }
};
export const listarAsignaciones = async (req, res) => {
  try {
    const { id_usuario } = req.user;

    const asignaciones = await PacienteMedicamento.findAll({
      include: [
        {
          model: Paciente,
          where: { id_usuario },
          attributes: ['id_paciente', 'nombre', 'apellido']
        },
        {
          model: Medicamento,
          attributes: ['id_medicamento', 'nombre']
        }
      ]
    });

    res.status(200).json({ success: true, data: asignaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al listar asignaciones', error: error.message });
  }
};

export const actualizarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, dosis, frecuencia } = req.body;

    const asignacion = await PacienteMedicamento.findByPk(id);
    if (!asignacion) return res.status(404).json({ success: false, message: 'Asignación no encontrada' });

    await asignacion.update({ fecha_inicio, fecha_fin, dosis, frecuencia });

    res.status(200).json({ success: true, data: asignacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};

export const eliminarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const asignacion = await PacienteMedicamento.findByPk(id);
    if (!asignacion) return res.status(404).json({ success: false, message: 'Asignación no encontrada' });

    await asignacion.destroy();
    res.status(200).json({ success: true, message: 'Asignación eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar', error: error.message });
  }
};
