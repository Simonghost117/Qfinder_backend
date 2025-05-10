import Medicamento from '../models/medicamento.model.js';

export const crearMedicamento = async (req, res) => {
  try {
    const nuevo = await Medicamento.create(req.body);
    res.status(201).json({ message: 'Medicamento creado exitosamente', data: nuevo });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear medicamento', error: error.message });
  }
};

export const listarMedicamentos = async (req, res) => {
  try {
    const medicamentos = await Medicamento.findAll();
    res.status(200).json(medicamentos);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar medicamentos', error: error.message });
  }
};

export const actualizarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await Medicamento.update(req.body, {
      where: { id_medicamento: id }
    });
    if (actualizado[0] === 0) {
      return res.status(404).json({ message: 'Medicamento no encontrado' });
    }
    res.status(200).json({ message: 'Medicamento actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar medicamento', error: error.message });
  }
};

export const eliminarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Medicamento.destroy({ where: { id_medicamento: id } });
    if (!eliminado) {
      return res.status(404).json({ message: 'Medicamento no encontrado' });
    }
    res.status(200).json({ message: 'Medicamento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar medicamento', error: error.message });
  }
};
