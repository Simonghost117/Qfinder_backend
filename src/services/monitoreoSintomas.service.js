import { RegistroSintoma } from '../models/MonitoreoSintomas.js';

export class MonitoreoSintomasService {
  static async registrarSintoma(datos) {
    const newRegristro =  RegistroSintoma.create(datos);

    if (!newRegristro) {
      throw new Error('Error al registrar el síntoma');
    }

    return newRegristro;
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
  }
  static async actualizarSintoma(id_paciente, id_registro, datos) {
    return await RegistroSintoma.update(datos, {
      where: { id_paciente, id_registro }
    });
  }
  static async eliminarSintoma(id_paciente, id_registro) {
    return await RegistroSintoma.destroy({
      where: { id_paciente, id_registro }
    });
  }
}
