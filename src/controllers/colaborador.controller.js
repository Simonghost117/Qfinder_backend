import Colaborador from '../models/colaborador.model.js';
import Usuario from '../models/usuario.model.js';
import Paciente from '../models/paciente.model.js';

export const buscarUsuarioPorCorreo = async (req, res) => {
  const { correo } = req.params;

  try {
    const usuario = await Usuario.findOne({
      where: { correo_usuario: correo },
      attributes: ['id_usuario', 'nombre_usuario', 'apellido_usuario', 'correo_usuario']
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { nombre_usuario, apellido_usuario, correo_usuario } = usuario;

    return res.status(200).json({
      nombre: nombre_usuario,
      apellido: apellido_usuario,
      correo: correo_usuario
    });
  } catch (error) {
    console.error('Error al buscar usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const agregarColaborador = async (req, res) => {
  const { id_usuario, id_paciente } = req.body;

  try {

    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario colaborador no encontrado' });
    }

  
    const paciente = await Paciente.findByPk(id_paciente);
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

  
    const yaExiste = await Colaborador.findOne({
      where: { id_usuario, id_paciente }
    });

    if (yaExiste) {
      return res.status(400).json({ error: 'Este usuario ya es colaborador de este paciente.' });
    }

  
    const nuevoColaborador = await Colaborador.create({ id_usuario, id_paciente });

    return res.status(201).json({ message: 'Colaborador agregado exitosamente', colaborador: nuevoColaborador });
  } catch (error) {
    console.error('Error al agregar colaborador:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const eliminarColaborador = async (req, res) => {
  const { id_usuario, id_paciente } = req.body;

  try {
    
    const colaboracion = await Colaborador.findOne({
      where: { id_usuario, id_paciente }
    });

    if (!colaboracion) {
      return res.status(404).json({ error: 'Colaborador no encontrado para este paciente' });
    }

    
    await colaboracion.destroy();

    return res.status(200).json({ message: 'Colaborador eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar colaborador:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};