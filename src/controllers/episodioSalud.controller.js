import { EpisodioSaludService } from '../services/episodioSalud.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { episodioSchema } from '../schema/episodioSalud.validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
//Verificar la forma en la que los episodios de salud son creados, ya que son limitados 
export class EpisodioSaludController {
  /**
   * Crea un nuevo episodio de salud para un paciente
   */
  static async crearEpisodio(req, res) {
    try {
      const id_paciente = this.validarIdPaciente(req.params.id_paciente);
      
      // Preparar datos asegurando valores válidos
      const datosEpisodio = {
        ...this.prepararDatosCreacion(req, id_paciente),
        estado: 'pendiente_revision',
        registrado_por_role: req.user.tipo_usuario
      };

      await episodioSchema.parseAsync(datosEpisodio);
      const episodio = await EpisodioSaludService.crearEpisodio(datosEpisodio);
      
      // await this.notificarSiEsNecesario(episodio);

      this.responderExito(res, 201, 'Episodio creado exitosamente', {
        id: episodio.id_episodio,
        id_paciente: episodio.id_paciente,
        tipo: episodio.tipo,
        severidad: episodio.severidad,
        estado: episodio.estado,
        fecha_hora_inicio: episodio.fecha_hora_inicio
      });
    } catch (error) {
      this.manejarErrorCreacion(res, error, req.file);
    }
  }

  /**
   * Obtiene todos los episodios de un paciente
   */
  static async obtenerEpisodiosPaciente(req, res) {
    try {
      const id_paciente = this.validarIdPaciente(req.params.id_paciente);
      const episodios = await EpisodioSaludService.obtenerPorPaciente(
        id_paciente, 
        req.user.tipo_usuario,
        req.pacienteRelation?.isOwner || false
      );
      
      this.responderExito(res, 200, 'Episodios obtenidos exitosamente', episodios);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * Obtiene un episodio específico
   */
  static async obtenerEpisodio(req, res) {
    try {
      const episodio = await EpisodioSaludService.obtenerPorId(req.params.id_episodio);
      
      if (!episodio) {
        throw { status: 404, message: 'Episodio no encontrado' };
      }
      
      this.responderExito(res, 200, 'Episodio obtenido exitosamente', episodio);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * Actualiza un episodio existente
   */
  static async actualizarEpisodio(req, res) {
    try {
      const { id_episodio } = req.params;
      const episodioExistente = await EpisodioSaludService.obtenerPorId(id_episodio);
      
      if (!episodioExistente) {
        throw { status: 404, message: 'Episodio no encontrado' };
      }
      
      // Verificar que el usuario es el creador (middleware ya verificó acceso al paciente)
      if (episodioExistente.registrado_por !== req.user.id_usuario) {
        throw { 
          status: 403, 
          message: 'Solo el creador puede modificar este episodio' 
        };
      }
      
      const datosActualizados = await this.prepararDatosActualizacion(req, episodioExistente);
      const episodioActualizado = await EpisodioSaludService.actualizarEpisodio(
        id_episodio, 
        datosActualizados
      );
      
      this.responderExito(res, 200, 'Episodio actualizado exitosamente', episodioActualizado);
    } catch (error) {
      handleError(res, error);
    }
  }

  /**
   * Elimina un episodio
   */
  static async eliminarEpisodio(req, res) {
    try {
      const { id_episodio } = req.params;
      const episodio = await EpisodioSaludService.obtenerPorId(id_episodio);
      
      if (!episodio) {
        throw { status: 404, message: 'Episodio no encontrado' };
      }
      
      // Verificar que el usuario es el creador (middleware ya verificó acceso al paciente)
      if (episodio.registrado_por !== req.user.id_usuario) {
        throw { 
          status: 403, 
          message: 'Solo el creador puede eliminar este episodio' 
        };
      }
      
      await this.eliminarMultimedia(episodio);
      await EpisodioSaludService.eliminarEpisodio(id_episodio);
      
      this.responderExito(res, 200, 'Episodio eliminado exitosamente');
    } catch (error) {
      handleError(res, error);
    }
  }

  // ============ MÉTODOS AUXILIARES ============

  static prepararDatosCreacion(req, id_paciente) {
    return {
      id_paciente,
      tipo: req.body.tipo,
      fecha_hora_inicio: req.body.fecha_hora_inicio || new Date(),
      severidad: parseInt(req.body.severidad || 3),
      sintomas: this.parsearSintomas(req.body.sintomas),
      descripcion: req.body.descripcion,
      multimedia: this.obtenerRutaMultimedia(req.file),
      registrado_por: req.user.id_usuario,
      origen: req.body.origen || 'cuidador',
      intervenciones: req.body.intervenciones
    };
  }

  static async prepararDatosActualizacion(req, episodioExistente) {
    const datosActualizados = req.body;

    if (req.file) {
      await this.eliminarMultimedia(episodioExistente);
      datosActualizados.multimedia = this.obtenerRutaMultimedia(req.file);
    }

    if (datosActualizados.sintomas) {
      datosActualizados.sintomas = this.parsearSintomas(datosActualizados.sintomas);
    }

    if (datosActualizados.severidad) {
      datosActualizados.severidad = parseInt(datosActualizados.severidad);
    }

    return datosActualizados;
  }

  static parsearSintomas(sintomas) {
    if (typeof sintomas === 'string') {
      try {
        return JSON.parse(sintomas);
      } catch {
        return [];
      }
    }
    return Array.isArray(sintomas) ? sintomas : [];
  }

  static obtenerRutaMultimedia(file) {
    return file ? path.relative(__dirname, file.path) : null;
  }

  static async eliminarMultimedia(episodio) {
    if (episodio.multimedia) {
      try {
        await fs.unlink(path.join(__dirname, episodio.multimedia));
      } catch (err) {
        console.error('Error eliminando archivo multimedia:', err);
      }
    }
  }

  static async notificarSiEsNecesario(episodio) {
    if (episodio.severidad >= 5 || episodio.origen === 'paciente') {
      await NotificacionesService.notificarCuidadores(episodio);
    }
  }

  static validarIdPaciente(id) {
    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      throw { status: 400, message: 'ID de paciente inválido' };
    }
    return idNum;
  }

  static manejarErrorCreacion(res, error, file) {
    if (file) {
      fs.unlink(file.path).catch(err => 
        console.error('Error limpiando archivo temporal:', err)
      );
    }

    const status = error.status || 500;
    const message = error.message || 'Error interno del servidor';
    const response = { success: false, message };

    if (error.errors) {
      response.errors = error.errors.map(err => ({
        field: err.path?.join('.') || 'unknown',
        message: err.message
      }));
    }

    res.status(status).json(response);
  }

  static responderExito(res, status, message, data = null) {
    const response = { success: true, message };
    if (data) response.data = data;
    res.status(status).json(response);
  }
}