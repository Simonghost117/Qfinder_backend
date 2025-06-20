import { models, sequelize } from "../models/index.js";
const { Usuario, Paciente, Subscription, Medicamento, Red, UsuarioRed } = models;

export const estadisticas = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.count({
      where: { tipo_usuario: 'Usuario' }
    });

    const totalAdministradores = await Usuario.count({
      where: { tipo_usuario: 'Administrador' }
    });

    const estadoUsuario = await Usuario.findAll({
      attributes: [
        'tipo_usuario',
        'estado_usuario',
        [sequelize.fn('COUNT', sequelize.col('id_usuario')), 'total']
      ],
      where: {
        estado_usuario: ['Activo', 'Inactivo']
      },
      group: ['tipo_usuario', 'estado_usuario'],
      raw: true
    });
    const resumenUsuario = {};

    estadoUsuario.forEach(({ tipo_usuario, estado_usuario, total }) => {
      if (!resumenUsuario[tipo_usuario]) {
        resumenUsuario[tipo_usuario] = {};
      }
      resumenUsuario[tipo_usuario][estado_usuario] = parseInt(total);
    });

    const totalPacientes = await Paciente.count();

     const pacientesAutonomia = await Paciente.findAll({
      attributes: [
        ['nivel_autonomia', 'nivel_autonomia'],
        [sequelize.fn('COUNT', sequelize.col('id_paciente')), 'total']
      ],
      where: {
        nivel_autonomia: ['alta', 'media', 'baja']
      },
      group: ['nivel_autonomia'],
      raw: true
    })

    const suscripcionUnica = await Subscription.findAll({
      attributes: ['id_usuario'],
      group: ['id_usuario']
    });

    const totalSuscripciones = suscripcionUnica.length;

    const resumenEstadosRaw = await Subscription.findAll({
      attributes: [
        'tipo_suscripcion',
        'estado_suscripcion',
        [sequelize.fn('COUNT', sequelize.col('id_usuario')), 'total']
      ],
      where: {
        tipo_suscripcion: ['plus', 'pro']
      },
      group: ['tipo_suscripcion', 'estado_suscripcion'],
      raw: true
    });
    const resumenEstados = {};

    resumenEstadosRaw.forEach(({ tipo_suscripcion, estado_suscripcion, total }) => {
      if (!resumenEstados[tipo_suscripcion]) {
        resumenEstados[tipo_suscripcion] = {};
      }
      resumenEstados[tipo_suscripcion][estado_suscripcion] = parseInt(total);
    });

    const totalMedicamentos = await Medicamento.count();
   

    const medicamentoTipos = await Medicamento.findAll({
      attributes: [
        ['tipo', 'tipo'],
        [sequelize.fn('COUNT', sequelize.col('id_medicamento')), 'total']
      ],
      where: {
        tipo: ['psiquiatrico', 'neurologico', 'general', 'otro']
      },
      group: ['tipo'],
      raw: true
    })

     const totalRedes = await Red.count();

     const redesConMasMembresias = await Red.findAll({
  attributes: [
    ['nombre_red', 'nombre'],
    [sequelize.fn('COUNT', sequelize.col('membresias.id_usuario_red')), 'total']

  ],
  include: [{
    model: UsuarioRed,
    as: 'membresias',
    attributes: [],
  }],
  group: ['red.id_red', 'red.nombre_red'],
  order: [[sequelize.literal('total'), 'DESC']],
  raw: true
});


    res.status(200).json({
      totalUsuarios,
      totalAdministradores,
      resumenUsuario,
      totalPacientes,
      pacientesAutonomia,
      totalRedes,
      redesConMasMembresias,
      totalSuscripciones,
      resumenEstados,
      totalMedicamentos,
      medicamentoTipos,
      
    });

  } catch (error) {
    console.error('Error al contar los usuarios:', error);
    res.status(500).json({ message: 'Error al contar los usuarios', error });
  }
};
