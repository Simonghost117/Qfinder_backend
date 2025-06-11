import { creacionRed, actualiza, buscarRedPorNombre } from '../services/redes.service.js';
import  Red  from '../models/Red.js';
import { Op } from'sequelize';
import { manejarImagenes } from '../utils/imgBase64.js';

export const crearRed = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { nombre_red, descripcion_red } = req.body;

    const nuevaRed = await creacionRed(id_usuario, nombre_red, descripcion_red);

    if (!nuevaRed || nuevaRed.length === 0) {
      return res.status(400).json({ 
        success: false,  // ← Campo añadido
        message: 'No se pudo crear la red' 
      });
    }
    
    res.status(201).json({ 
      success: true,  // ← Campo añadido
      message: 'Red creada exitosamente', 
      data: nuevaRed 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,  // ← Campo añadido
      message: 'Error al crear red', 
      error: error.message 
    });
  }
};

export const listarRedes = async (req, res) => {
  try {
    const redes = await Red.findAll();

    if (!redes || redes.length === 0) {
      return res.status(404).json({ 
        success: false,  // ← Campo añadido
        message: 'No se encontraron redes' 
      });
    }

    res.status(200).json({ 
      success: true,  // ← Campo añadido
      message: 'Redes encontradas', 
      data: redes 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,  // ← Campo añadido
      message: 'Error al listar redes', 
      error: error.message 
    });
  }
}

export const listarRedId = async (req, res) => {
  try {
    const { id_red } = req.params;

    const red = await Red.findOne({ where: { id_red } });

    if (!red) {
      return res.status(404).json({ message: 'Red no encontrada' });
    }

    res.status(200).json({ message: 'Red encontrada', data: red });
  } catch (error) {
    res.status(500).json({ message: 'Error al listar red', error: error.message });
  }
}

export const actualizarRed = async (req, res) => {
  try {
    const { id_red } = req.params;
    const { nombre_red, descripcion_red, imagen_red } = req.body;
    
    const red = await Red.findOne({ where: { id_red } });

    if (!red) {
      return res.status(404).json({ message: 'Red no encontrada' });
    }

    // Manejo de imagen
        let nueva_imagen;
        try {
          nueva_imagen = await manejarImagenes(imagen_red, red.imagen_red);
        } catch (error) {
          return res.status(400).json({ 
            success: false,
            message: error.message 
          });
        }

    const redActualizada = await actualiza(id_red, nombre_red, descripcion_red, nueva_imagen);

    if (!redActualizada) {
      return res.status(400).json({ message: 'No se pudo actualizar la red' });
    }


    res.status(200).json({ 
      success: true,
      message: 'Red actualizada exitosamente', 
      data: {
        nombre_red: redActualizada.nombre_red,
        descripcion_red: redActualizada.descripcion_red,
        imagen_red: redActualizada.imagen_red
      }
     });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar red', error: error.message });
  } 
}

export const eliminarRed = async (req, res) => {
  try {
    const { id_red } = req.params;

    const redEliminada = await Red.destroy({ where: { id_red } });

    if (!redEliminada) {
      return res.status(404).json({ message: 'Red no encontrada' });
    }

    res.status(200).json({ message: 'Red eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar red', error: error.message });
  }
};

export const redNombre = async (req, res) => {
  try {
    // const { nombre_red } = req.params;
    const { nombre_red} = req.body;

    const red = await buscarRedPorNombre(nombre_red);

    if (!red) {
      return res.status(404).json({ message: "Red no encontrada" });
    }

    res.status(200).json({ message: "Red encontrada", data: red });
  } catch (error) {
    res.status(500).json({ message: "Error al listar red", error: error.message });
  }
};

export const obtenerIdRedPorNombre = async (req, res) => {
    try {
        const { nombre } = req.query;
        
        console.log(`Buscando red por nombre: ${nombre}`);
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Nombre de red requerido',
                id_red: 0,
                nombre_red: '',
                descripcion_red: ''
            });
        }

        // Buscar en la base de datos (case-insensitive)
        const red = await Red.findOne({ 
            where: { 
                nombre_red: { 
                    [Op.iLike]: nombre // Búsqueda insensible a mayúsculas/minúsculas
                }
            },
            raw: true
        });
        
        if (!red) {
            console.log(`Red no encontrada: ${nombre}`);
            return res.status(200).json({ 
                success: false,
                message: 'Red no encontrada',
                id_red: 0,
                nombre_red: nombre,
                descripcion_red: ''
            });
        }

        console.log(`Red encontrada: ${red.id_red} - ${red.nombre_red}`);
        
        return res.status(200).json({
            success: true,
            message: "Red encontrada",
            id_red: red.id_red,
            nombre_red: red.nombre_red,
            descripcion_red: red.descripcion_red || ''
        });
        
    } catch (error) {
        console.error(`Error al buscar red: ${error.message}`, error.stack);
        return res.status(500).json({ 
            success: false,
            message: "Error interno del servidor",
            id_red: 0,
            nombre_red: '',
            descripcion_red: ''
        });
    }
};