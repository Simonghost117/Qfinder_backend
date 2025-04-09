import db from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';

const { CuidadoPersonal } = db;

export const obtenerReporteCuidadoPersonal = async (idPaciente) => {
  const hoy = new Date();
  const hace7Dias = new Date(hoy);
  hace7Dias.setDate(hoy.getDate() - 7);

  const hace30Dias = new Date(hoy);
  hace30Dias.setDate(hoy.getDate() - 30);

  // 1. Porcentaje por nivel de asistencia (últimos 7 días)
  const registrosSemana = await CuidadoPersonal.findAll({
    where: {
      id_paciente: idPaciente,
      fecha: { [Op.gte]: hace7Dias }
    },
    attributes: ['nivel_asistencia', [fn('COUNT', '*'), 'cantidad']],
    group: ['nivel_asistencia']
  });

  // Total de registros para calcular porcentajes
  const totalSemana = registrosSemana.reduce((acc, r) => acc + parseInt(r.dataValues.cantidad), 0);
  const porcentajes = {};
  registrosSemana.forEach(r => {
    porcentajes[r.nivel_asistencia] = parseFloat((r.dataValues.cantidad / totalSemana * 100).toFixed(2));
  });

  // 2. Evolución mensual: agrupado por semana
  const registrosMes = await CuidadoPersonal.findAll({
    where: {
      id_paciente: idPaciente,
      fecha: { [Op.gte]: hace30Dias }
    },
    attributes: [
      [fn('WEEK', col('fecha')), 'semana'],
      'nivel_asistencia',
      [fn('COUNT', '*'), 'cantidad']
    ],
    group: ['semana', 'nivel_asistencia'],
    order: [['semana', 'ASC']]
  });

  // Organizar los datos por semana
  const evolucionMensual = {};
  registrosMes.forEach(({ dataValues }) => {
    const semana = `Semana ${dataValues.semana}`;
    if (!evolucionMensual[semana]) evolucionMensual[semana] = {};
    evolucionMensual[semana][dataValues.nivel_asistencia] = dataValues.cantidad;
  });

  return { porcentajes, evolucionMensual };
};

// Comparar asistencia actual vs anterior semana
export const detectarAumentoAsistencia = async (idPaciente) => {
    const hoy = new Date();
    const estaSemana = new Date(hoy);
    const semanaPasada = new Date(hoy);
  
    estaSemana.setDate(hoy.getDate() - 0);
    semanaPasada.setDate(hoy.getDate() - 14);
  
    const registros = await CuidadoPersonal.findAll({
      where: {
        id_paciente: idPaciente,
        fecha: { [Op.between]: [semanaPasada, hoy] }
      },
      attributes: ['nivel_asistencia', [fn('COUNT', '*'), 'cantidad']],
      group: ['nivel_asistencia', fn('WEEK', col('fecha'))],
      order: [[fn('WEEK', col('fecha')), 'ASC']]
    });
  
    // Separar por semana
    const conteo = { semana1: {}, semana2: {} };
    registros.forEach(({ dataValues }) => {
      const semana = dataValues.semana === fn('WEEK', semanaPasada) ? 'semana1' : 'semana2';
      conteo[semana][dataValues.nivel_asistencia] = parseInt(dataValues.cantidad);
    });
  
    // Lógica de aumento: si sube "dependiente" o "asistido"
    const aumento = (
      (conteo.semana2.dependiente || 0) > (conteo.semana1.dependiente || 0) ||
      (conteo.semana2.asistido || 0) > (conteo.semana1.asistido || 0)
    );
  
    return aumento;
  };
  
