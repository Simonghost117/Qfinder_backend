import Medicamento from '../models/medicamento.model.js';
import { Op } from 'sequelize';
import {PaginationService} from '../utils/paginationUtils.js';

export const crearMedicamento = async (req, res) => {
  try {
    const datos = req.body;
    console.log("Datos recibidos para crear medicamento:", datos);

    if (Array.isArray(datos)) {
      // Si es un arreglo, crear múltiples registros
      const nuevosMedicamentos = await Medicamento.bulkCreate(datos);
      res.status(201).json({
        message: "Medicamentos creados exitosamente",
        data: nuevosMedicamentos
      });
    } else {
      // Si es un solo objeto, crear un solo registro
      const nuevoMedicamento = await Medicamento.create({
        ...datos,
        id_usuario: req.user.id_usuario
      });
      res.status(201).json({
        message: "Medicamento creado exitosamente",
        data: nuevoMedicamento
      });
    }
  } catch (error) {
    console.log("Error al crear medicamento: ", error)
    res.status(500).json({
      message: "Error al crear medicamento",
      error: error.message
    });
  }
};

export const listarMedicamentos = async (req, res) => {
  try {
    // const { id_usuario } = req.user; // Extraemos el usuario autenticado

    const medicamentos = await Medicamento.findAll(
    //   {
    //   where: { id_usuario } // Solo los del usuario actual
    // }
    { order: [["id_medicamento", "DESC"]] }
  );

    res.status(200).json(medicamentos);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar medicamentos', error: error.message });
  }
};


export const listarMedicamentosId = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.user;

    const medicamento = await Medicamento.findOne({
      where: {
        id_medicamento: id,
        id_usuario
      }
    });

    if (!medicamento) {
      return res.status(404).json({ message: 'Medicamento no encontrado o no autorizado' });
    }

    res.status(200).json(medicamento);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar medicamento', error: error.message });
  }
};

export const actualizarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.user;

    // Verificar que el medicamento exista y pertenezca al usuario
    const medicamento = await Medicamento.findOne({
      where: {
        id_medicamento: id,
        id_usuario
      }
    });

    if (!medicamento) {
      return res.status(404).json({ message: 'Medicamento no encontrado o no autorizado' });
    }

    // Actualizar si pertenece al usuario
    await medicamento.update(req.body);

    res.status(200).json({ message: 'Medicamento actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar medicamento', error: error.message });
  }
};


export const eliminarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.user;

    // Verificar que el medicamento exista y pertenezca al usuario
    const medicamento = await Medicamento.findOne({
      where: {
        id_medicamento: id,
        id_usuario
      }
    });

    if (!medicamento) {
      return res.status(404).json({ message: 'Medicamento no encontrado o no autorizado' });
    }

    // Eliminar si pertenece al usuario
    await medicamento.destroy();

    res.status(200).json({ message: 'Medicamento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar medicamento', error: error.message });
  }
};

export const listarMedicamentos2 = async (req, res) => {
  try { 
    const where = {
    };
  
    if (req.query.estado) {
      where.estado_usuario = req.query.estado;
    }
    
    if (req.query.busqueda) {
      const searchTerm = req.query.busqueda.toLowerCase(); 
      
      where[Op.or] = [
        { 
          nombre: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        { 
          tipo: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        }
      ];
    }

    const result = await PaginationService.paginate(Medicamento, {
      where,
      order: [['id_medicamento', 'DESC']],
      req,
      transformData: (medicamentos) => medicamentos.map(medicamento => ({
        id_medicamento: medicamento.id_medicamento,
        id_usuario : medicamento.id_usuario ,
        nombre: medicamento.nombre,
        descripcion: medicamento.descripcion,
        tipo: medicamento.tipo,
        
      }))
    });

    res.status(200).json(result);
  
  } catch (error) {
    res.status(500).json({ message: 'Error al listar medicamentos', error: error.message });
  }
};