import { models, sequelize } from "../models/index.js";
const { Usuario, Paciente, Subscription, Medicamento, Red } = models; 

export const estadisticas = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.count({
      where: { tipo_usuario: 'Usuario' }
    });

    const totalAdministradores = await Usuario.count({
      where: { tipo_usuario: 'Administrador' }
    });

    const totalPacientes = await Paciente.count();

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


    // const resumenEstados = await Subscription.findAll({
    //   attributes: [
    //     ['estado_suscripcion', 'estado'],
    //     [sequelize.fn('COUNT', sequelize.col('id_usuario')), 'total']
    //   ],
    //   where: {
    //     tipo_suscripcion: ['plus', 'pro']
    //   },
    //   group: ['estado_suscripcion'],
    //   raw: true
    // });

    const totalMeicamentos = await Medicamento.count();
    const totalRedes = await Red.count();

    res.status(200).json({
      totalUsuarios,
      totalAdministradores,
      totalPacientes, 
      totalMeicamentos,
      totalRedes,
      totalSuscripciones,
      resumenEstados
    });

  } catch (error) {
    console.error('Error al contar los usuarios:', error);
    res.status(500).json({ message: 'Error al contar los usuarios', error });
  }
};
