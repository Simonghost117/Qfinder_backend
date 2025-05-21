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
// controllers/pacienteMedicamento.controller.js
export const listarMedicamentosPorPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const { id_usuario } = req.user;

    // Verificar que el paciente pertenece al usuario
    const paciente = await Paciente.findOne({
      where: { id_paciente, id_usuario }
    });

    if (!paciente) {
      return res.status(200).json([]); // Devuelve array vacío si no existe o no pertenece
    }

    const asignaciones = await PacienteMedicamento.findAll({
      where: { id_paciente },
      include: [
        {
          model: Medicamento,
          attributes: ['id_medicamento', 'nombre', 'descripcion']
        }
      ],
      attributes: ['id_pac_medicamento', 'fecha_inicio', 'fecha_fin', 'dosis', 'frecuencia']
    });

    // Mapear los resultados a un formato más simple si es necesario
    const resultado = asignaciones.map(asignacion => ({
      idAsignacion: asignacion.id_pac_medicamento,
      fechaInicio: asignacion.fecha_inicio,
      fechaFin: asignacion.fecha_fin,
      dosis: asignacion.dosis,
      frecuencia: asignacion.frecuencia,
      medicamento: asignacion.Medicamento
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al listar medicamentos:', error);
    res.status(500).json([]); // Devuelve array vacío en caso de error
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
