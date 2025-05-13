import { RegistroSintoma } from '../models/MonitoreoSintomas.js';

export class MonitoreoSintomasService {
  static async registrarSintoma(datos) {
    return await RegistroSintoma.create(datos);
  }

  static async obtenerPorPaciente(id_paciente) {
    return await RegistroSintoma.findAll({
      where: { id_paciente },
      order: [['fecha_sintoma', 'DESC']]
    });
  }
static async obtenerSintomaPorId(id_paciente, id_registro) {
  return await RegistroSintoma.findAll({
    where: {
      id_paciente: parseInt(id_paciente), // 💡 Asegura que es un número
      id_registro: parseInt(id_registro)  // 💡 También convierte aquí
    }
  });
}}