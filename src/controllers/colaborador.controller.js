import { models } from '../models/index.js';
const { Subscription, Colaborador, Usuario, Paciente } = models;


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

    const { id_usuario, nombre_usuario, apellido_usuario, correo_usuario } = usuario;

    return res.status(200).json({
      id_usuario: id_usuario,
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
  const idSolicitante = req.user.id_usuario; 

  try {
    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario colaborador no encontrado' });
    }

    const paciente = await Paciente.findByPk(id_paciente);
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Verificar si ya es colaborador del paciente
    const yaExiste = await Colaborador.findOne({
      where: { id_usuario, id_paciente }
    });

    if (yaExiste) {
      return res.status(400).json({ error: 'Este usuario ya es colaborador de este paciente.' });
    }

    // Obtener al solicitante con su suscripción
    const solicitante = await Usuario.findByPk(idSolicitante, {
      include: [{
        model: Subscription,
        as: 'subscription',
        where: { estado_suscripcion: 'active' },
        required: false
      }]
    });

    if (!solicitante) {
      return res.status(404).json({ error: 'Usuario solicitante no encontrado' });
    }

    // Obtener el límite de cuidadores según la suscripción
    let limiteColaboradores = 2; // default para free
    if (solicitante.subscription && typeof solicitante.subscription.limite_cuidadores === 'number') {
      limiteColaboradores = solicitante.subscription.limite_cuidadores;
    }

    // Obtener todos los pacientes del usuario solicitante
    const pacientesDelUsuario = await Paciente.findAll({
      where: { id_usuario: idSolicitante },
      attributes: ['id_paciente']
    });

    const idsPacientes = pacientesDelUsuario.map(p => p.id_paciente);

    // Contar todos los colaboradores asociados a esos pacientes
    const totalColaboradores = await Colaborador.count({
      where: {
        id_paciente: idsPacientes
      }
    });

    if (totalColaboradores >= limiteColaboradores) {
      return res.status(400).json({
        error: `Has alcanzado el límite de ${limiteColaboradores} colaboradores permitidos por tu plan.`
      });
    }

    // Crear el colaborador
    const nuevoColaborador = await Colaborador.create({ id_usuario, id_paciente });

    // const io = req.app.get('io');
    //   io.emit('nuevo_colaborador', {
    //     id_usuario,
    //     id_paciente,
    //     timestamp: new Date().toISOString()
    //   });

    return res.status(201).json({
      message: 'Colaborador agregado exitosamente',
      colaborador: nuevoColaborador
    });

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

<<<<<<< HEAD
export const listarColaboradoresDeMisPacientes = async (req, res) => {
  const { id_usuario } = req.user;
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const pacientes = await Paciente.findAll({
      where: { id_usuario },
      attributes: ['id_paciente', 'nombre']
    });

    if (!pacientes.length) {
      return res.status(404).json({ error: 'No se encontraron pacientes para este usuario.' });
    }

    const idPacientes = pacientes.map(p => p.id_paciente);
    const offset = (page - 1) * limit;

    const whereUsuario = search
      ? {
          [Op.or]: [
            { nombre_usuario: { [Op.iLike]: `%${search}%` } },
            { apellido_usuario: { [Op.iLike]: `%${search}%` } }
          ]
        }
      : {};

    const { rows: colaboradores, count: totalGlobal } = await Colaborador.findAndCountAll({
      where: { id_paciente: { [Op.in]: idPacientes } },
      include: [
        {
          model: Usuario,
          attributes: ['id_usuario', 'nombre_usuario', 'apellido_usuario', 'correo_usuario' , 'imagen_usuario'],
          where: whereUsuario
        },
        {
          model: Paciente,
          attributes: ['id_paciente', 'nombre']
        }
      ],
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

    const resultado = colaboradores.map(c => ({
      id_usuario: c.Usuario.id_usuario,
      nombre: c.Usuario.nombre_usuario,
      apellido: c.Usuario.apellido_usuario,
      correo: c.Usuario.correo_usuario,
      imagen_usuario: c.Usuario.imagen_usuario,
      id_paciente: c.Paciente.id_paciente,
      paciente: c.Paciente.nombre
    }));

    return res.status(200).json({
      page: parseInt(page),
      limit: parseInt(limit),
      total: resultado.length,
      totalGlobal,
      colaboradores: resultado
    });
  } catch (error) {
    console.error('Error al listar colaboradores:', error.message);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

=======
export const cantColaboradores = async (req, res) => {
  try {
  const colaboradoresUnicos = await Colaborador.findAll({
      attributes: ['id_usuario'],
      group: ['id_usuario']
    });
    const totalColaboradores = colaboradoresUnicos.length
  if(!totalColaboradores || colaboradoresUnicos.length === 0){
    res.status(404).json({
      success: false,
      message: 'No hay colaboradores registrados'
    })
  }
  res.status(200).json({
      success: true,
      totalColaboradores
    });
} catch (error) {
  console.error("Error al contar los colaboradores:", error);
    res.status(500).json({
      success: false,
      message: 'Error al contar los colaboradores',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
}
}
>>>>>>> origin/Alison
