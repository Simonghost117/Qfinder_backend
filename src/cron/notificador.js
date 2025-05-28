// import cron from 'node-cron';
// import { Op } from 'sequelize';
// import { models } from '../models/index.js';
// const { PacienteMedicamento, Paciente } = models;
// import { sendPushNotification } from '../utils/noti.enviar.js';

// function parseFrecuencia(frecuencia) {
//   const match = frecuencia?.match(/^(\d+)([hd])$/); // ej: 8h, 1d
//   if (!match) return null;

//   const valor = parseInt(match[1]);
//   const unidad = match[2];

//   if (unidad === 'h') return valor * 60 * 60 * 1000;
//   if (unidad === 'd') return valor * 24 * 60 * 60 * 1000;

//   return null;
// }

// cron.schedule('*/10 * * * *', async () => {
//   const now = new Date();

//   const tratamientos = await PacienteMedicamento.findAll({
//     where: {
//       notificaciones_activas: true,
//       fecha_inicio: { [Op.lte]: now },
//       fecha_fin: { [Op.gte]: now },
//     },
//     include: [Paciente]
//   });

//   for (const tratamiento of tratamientos) {
//     const frecuenciaMs = parseFrecuencia(tratamiento.frecuencia);
//     if (!frecuenciaMs) continue;

//     const proxima = tratamiento.proxima_dosis || tratamiento.fecha_inicio;

//     if (now >= proxima) {
//       await sendPushNotification({
//         token: tratamiento.Paciente?.fcm_token,
//         title: 'Recordatorio de Medicación',
//         body: `Toma tu medicamento: ${tratamiento.dosis || 'consulta tu tratamiento'}`,
//       });

//       await tratamiento.update({
//         ultimo_recordatorio: now,
//         proxima_dosis: new Date(now.getTime() + frecuenciaMs)
//       });
//     }
//   }
// });
