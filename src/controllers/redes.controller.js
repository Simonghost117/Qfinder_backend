import UsuarioRed from '../models/UsuarioRed.js';

export const unirRedGlobal = async (req, res) => {
  try {
    // El ID viene del middleware de autenticación
    const userId = req.userId; 

    const [relacion, created] = await UsuarioRed.findOrCreate({
      where: { id_usuario: userId },
      defaults: {
        estado: 'activa'
      }
    });

    if (!created) {
      await relacion.update({ estado: 'activa' });
    }

    res.status(200).json({ 
      message: 'Unido a la red global exitosamente',
      data: relacion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verificarMembresia = async (req, res) => {
  try {
    const userId = req.userId;
    const membresia = await UsuarioRed.findOne({
      where: { id_usuario: userId }
    });

    res.json({ 
      esMiembro: !!membresia,
      estado: membresia?.estado || 'no_registrado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

