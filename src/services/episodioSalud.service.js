import { EpisodioSalud } from '../models/EpisodioSalud.js';
import { NotificacionesService } from './notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';

export class EpisodioSaludService {
  static async crearEpisodio(data) {
    console.log("Datos recibidos:", data);
    try {
      // Validación de campos requeridos
      if (!data.id_paciente) {
        throw new Error('El campo id_paciente es requerido');
      }

      // Asegurar que el estado tenga un valor válido
      const estadosPermitidos = ['pendiente_revision', 'en_proceso', 'resuelto', 'cancelado', 'confirmado'];
      if (!data.estado || !estadosPermitidos.includes(data.estado)) {
        data.estado = 'pendiente_revision'; // Valor por defecto
      }

      // Validar rol del registrador con valor por defecto
      const rolesPermitidos = ['Familiar', 'Administrador'];
      if (!data.registrado_por_role || !rolesPermitidos.includes(data.registrado_por_role)) {
        // Asignar 'Familiar' como valor por defecto si no es válido
        data.registrado_por_role = 'Familiar';
        console.warn(`Rol del registrador no especificado o inválido. Se asignó 'Familiar' por defecto.`);
      }

      const episodio = await EpisodioSalud.create(data);

      // Notificaciones según severidad
      const notificacionesService = new NotificacionesService();
      if (episodio.severidad >= 5 || data.origen === 'paciente') {
        await notificacionesService.notificarCuidadores(episodio);
      }

      return episodio;
    } catch (error) {
      console.error("Error detallado al crear episodio:", error);

      // Manejo específico de errores de Sequelize
      if (error.name === 'SequelizeValidationError') {
        const mensajes = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
        throw new Error(`Error de validación: ${mensajes}`);
      } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new Error('Error de relación: Verifica que el id_paciente exista');
      } else if (error.name === 'SequelizeDatabaseError') {
        throw new Error(`Error en la base de datos: ${error.message}`);
      }

      handleError(error);
      throw new Error(`Error al crear episodio: ${error.message}`);
    }
  }

  static async obtenerPorPaciente(idPaciente, rolUsuario) {
    try {
      const where = { id_paciente: idPaciente };

      // Restricción para pacientes: solo ver episodios confirmados
      if (rolUsuario === 'Paciente') {
        where.estado = 'confirmado';
      }

      return await EpisodioSalud.findAll({ 
        where,
        order: [['fecha_hora_inicio', 'DESC']],
        attributes: {
          exclude: ['created_at', 'updated_at'] // Excluir campos innecesarios
        }
      });
    } catch (error) {
      console.error("Error al obtener episodios:", error);
      handleError(error);
      throw new Error(`Error al obtener episodios: ${error.message}`);
    }
  }

  static async obtenerPorId(idEpisodio) {
    try {
      const episodio = await EpisodioSalud.findByPk(idEpisodio, {
        attributes: {
          exclude: ['created_at', 'updated_at']
        }
      });
      
      if (!episodio) {
        throw new Error('Episodio no encontrado');
      }
      
      return episodio;
    } catch (error) {
      console.error("Error al obtener episodio:", error);
      handleError(error);
      throw new Error(`Error al obtener episodio: ${error.message}`);
    }
  }

  static async actualizarEpisodio(idEpisodio, datosActualizados) {
    try {
      // Validar estado si viene en la actualización
      if (datosActualizados.estado) {
        const estadosPermitidos = ['pendiente_revision', 'en_proceso', 'resuelto', 'cancelado', 'confirmado'];
        if (!estadosPermitidos.includes(datosActualizados.estado)) {
          throw new Error('Estado no válido');
        }
      }

      const [affectedCount] = await EpisodioSalud.update(datosActualizados, {
        where: { id_episodio: idEpisodio }
      });

      if (affectedCount === 0) {
        throw new Error('No se encontró el episodio para actualizar');
      }

      return affectedCount;
    } catch (error) {
      console.error("Error al actualizar episodio:", error);
      handleError(error);
      throw new Error(`Error al actualizar episodio: ${error.message}`);
    }
  }

  static async eliminarEpisodio(idEpisodio) {
    try {
      const deletedCount = await EpisodioSalud.destroy({
        where: { id_episodio: idEpisodio }
      });

      if (deletedCount === 0) {
        throw new Error('No se encontró el episodio para eliminar');
      }

      return deletedCount;
    } catch (error) {
      console.error("Error al eliminar episodio:", error);
      handleError(error);
      throw new Error(`Error al eliminar episodio: ${error.message}`);
    }
  }
}