import { EpisodioSalud } from '../models/index.js';
import { NotificacionesService } from './notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';

export class EpisodioSaludService {
  static async crearEpisodio(data) {
    try {
      const episodio = await EpisodioSalud.create(data);
      
      // Notificar si es necesario
      if (episodio.severidad >= 5 || data.origen === 'paciente') {
        await NotificacionesService.notificarCuidadores(episodio);
      }
      
      return episodio;
    } catch (error) {
      handleError(error);
      throw new Error('Error al crear episodio');
    }
  }

  static async obtenerPorPaciente(idPaciente, rolUsuario) {
    try {
      const where = { id_paciente: idPaciente };
      
      if (rolUsuario === 'Paciente') {
        where.estado = 'confirmado';
      }
      
      return await EpisodioSalud.findAll({ 
        where,
        order: [['fecha_hora_inicio', 'DESC']]
      });
    } catch (error) {
      handleError(error);
      throw new Error('Error al obtener episodios');
    }
  }

  static async obtenerPorId(idEpisodio) {
    try {
      return await EpisodioSalud.findByPk(idEpisodio);
    } catch (error) {
      handleError(error);
      throw new Error('Error al obtener episodio');
    }
  }

  static async actualizarEpisodio(idEpisodio, datosActualizados) {
    try {
      const [updated] = await EpisodioSalud.update(datosActualizados, {
        where: { id_episodio: idEpisodio }
      });
      return updated;
    } catch (error) {
      handleError(error);
      throw new Error('Error al actualizar episodio');
    }
  }

  static async eliminarEpisodio(idEpisodio) {
    try {
      return await EpisodioSalud.destroy({
        where: { id_episodio: idEpisodio }
      });
    } catch (error) {
      handleError(error);
      throw new Error('Error al eliminar episodio');
    }
  }
}