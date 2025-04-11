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
}
