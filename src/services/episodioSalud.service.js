import { EpisodioSalud } from '../models/index.js';
import { NotificacionesService } from './notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';

export class EpisodioSaludService {
  static async crearEpisodio(data) {
    console.log("Datos recibidos:", data); 
    try {
      if (!data.id_paciente) {
        throw new Error('El campo id_paciente es requerido');
      }
      
      const episodio = await EpisodioSalud.create(data);

      // ✅ Instancia del servicio de notificaciones
      const notificacionesService = new NotificacionesService();

      if (episodio.severidad >= 5 || data.origen === 'paciente') {
        await notificacionesService.notificarCuidadores(episodio);
      }

      return episodio;
    } catch (error) {
      console.error("Error detallado al crear episodio:", error);

      if (error.name === 'SequelizeValidationError') {
        throw new Error(`Error de validación: ${error.errors.map(e => e.message).join(', ')}`);
      } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new Error('Error de clave foránea: Verifica que el id_paciente sea válido');
      } else if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Error de duplicidad: Este episodio ya existe');
      } else {
        handleError(error);
        throw new Error(`Error al crear episodio: ${error.message}`);
      }
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
      console.error("Error al obtener episodios:", error);
      handleError(error);
      throw new Error(`Error al obtener episodios: ${error.message}`);
    }
  }

  static async obtenerPorId(idEpisodio) {
    try {
      return await EpisodioSalud.findByPk(idEpisodio);
    } catch (error) {
      console.error("Error al obtener episodio:", error);
      handleError(error);
      throw new Error(`Error al obtener episodio: ${error.message}`);
    }
  }

  static async actualizarEpisodio(idEpisodio, datosActualizados) {
    try {
      const [updated] = await EpisodioSalud.update(datosActualizados, {
        where: { id_episodio: idEpisodio }
      });
      return updated;
    } catch (error) {
      console.error("Error al actualizar episodio:", error);
      handleError(error);
      throw new Error(`Error al actualizar episodio: ${error.message}`);
    }
  }

  static async eliminarEpisodio(idEpisodio) {
    try {
      return await EpisodioSalud.destroy({
        where: { id_episodio: idEpisodio }
      });
    } catch (error) {
      console.error("Error al eliminar episodio:", error);
      handleError(error);
      throw new Error(`Error al eliminar episodio: ${error.message}`);
    }
  }
}
