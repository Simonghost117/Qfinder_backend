import { EpisodioSaludService } from '../services/episodioSalud.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { Familiar } from '../models/Familiar.js';
import Paciente from '../models/paciente.model.js';
import { episodioSchema } from '../schema/episodioSalud.validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EpisodioSaludController {
  /**
   * Crea un nuevo episodio de salud para un paciente
   */
  static async crearEpisodio(req, res) {
    try {
      const id_paciente = this.validarIdPaciente(req.params.id_paciente);
      
      // Verificar si el usuario es familiar del paciente
      const esFamiliar = await this.verificarFamiliar(req.user.id_usuario, id_paciente);
      if (!esFamiliar) {
        throw { status: 403, message: 'Solo los familiares registrados pueden crear episodios' };
      }

      // Preparar datos asegurando que 'estado' y 'registrado_por_role' tengan valores válidos
      const datosEpisodio = {
        ...this.prepararDatosCreacion(req, id_paciente),
        estado: 'pendiente_revision', // Valor por defecto válido
        registrado_por_role: req.user.tipo_usuario || 'Familiar' // Valor por defecto si no existe
      };

      await episodioSchema.parseAsync(datosEpisodio);
      const episodio = await EpisodioSaludService.crearEpisodio(datosEpisodio);
      
      // await this.notificarSiEsNecesario(episodio);

      this.responderExito(res, 201, 'Episodio creado exitosamente', {
        id: episodio.id_episodio,
        tipo: episodio.tipo,
        severidad: episodio.severidad,
        estado: episodio.estado,
        fecha_hora_inicio: episodio.fecha_hora_inicio
      });
    } catch (error) {
      this.manejarErrorCreacion(res, error, req.file);
    }
  }

  // Nueva función para verificar familiar
  static async verificarFamiliar(idUsuario, idPaciente) {
    const familiar = await Familiar.findOne({
      where: { 
        id_usuario: idUsuario, 
        id_paciente: idPaciente 
      }
    });
    return !!familiar;
  }

  /**
   * Obtiene todos los episodios de un paciente
   */
  static async obtenerEpisodiosPaciente(req, res) {
    try {
      const id_paciente = this.validarIdPaciente(req.params.id_paciente);
      await this.verificarAccesoEpisodios(req.user, id_paciente);
      
      const episodios = await EpisodioSaludService.obtenerPorPaciente(
        id_paciente, 
        req.user.tipo_usuario
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
      const episodio = await this.obtenerYVerificarEpisodio(
        req.params.id_episodio, 
        req.user
      );
      
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
      const episodioExistente = await this.obtenerYVerificarEpisodio(id_episodio, req.user);
      
      this.verificarPermisosEdicion(episodioExistente, req.user);
      
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
      const episodio = await this.obtenerYVerificarEpisodio(id_episodio, req.user);
      
      this.verificarPermisosEdicion(episodio, req.user);
      await this.eliminarMultimedia(episodio);
      await EpisodioSaludService.eliminarEpisodio(id_episodio);
      
      this.responderExito(res, 200, 'Episodio eliminado exitosamente');
    } catch (error) {
      handleError(res, error);
    }
  }

  // ============ MÉTODOS AUXILIARES ============

  /**
   * Prepara los datos para crear un nuevo episodio
   */
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
      registrado_por_role: req.user.tipo_usuario || 'Familiar', // Valor por defecto
      estado: 'pendiente_revision', // Estado consistente con el servicio
      origen: req.body.origen || 'cuidador',
      intervenciones: req.body.intervenciones
    };
  }

  /**
   * Prepara los datos para actualizar un episodio
   */
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

  /**
   * Parsea los síntomas del episodio
   */
  static parsearSintomas(sintomas) {
    if (typeof sintomas === 'string') {
      try {
        return JSON.parse(sintomas);
      } catch (e) {
        console.warn('Error al parsear síntomas:', e);
        return [];
      }
    }
    return Array.isArray(sintomas) ? sintomas : [];
  }

  /**
   * Obtiene la ruta relativa del archivo multimedia
   */
  static obtenerRutaMultimedia(file) {
    return file ? path.relative(__dirname, file.path) : null;
  }

  /**
   * Elimina el archivo multimedia asociado a un episodio
   */
  static async eliminarMultimedia(episodio) {
    if (episodio.multimedia) {
      try {
        await fs.unlink(path.join(__dirname, episodio.multimedia));
      } catch (err) {
        console.error('Error eliminando archivo multimedia:', err);
      }
    }
  }

  /**
   * Notifica a los cuidadores si el episodio es grave
   */
  static async notificarSiEsNecesario(episodio) {
    if (episodio.severidad >= 5 || episodio.origen === 'paciente') {
      await NotificacionesService.notificarCuidadores(episodio);
    }
  }

  /**
   * Obtiene y verifica un episodio
   */
  static async obtenerYVerificarEpisodio(idEpisodio, usuario) {
    const episodio = await EpisodioSaludService.obtenerPorId(idEpisodio);
    if (!episodio) {
      throw { status: 404, message: 'Episodio no encontrado' };
    }

    await this.verificarAccesoEpisodios(usuario, episodio.id_paciente);
    return episodio;
  }

  /**
   * Valida el ID del paciente
   */
  static validarIdPaciente(id) {
    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      throw { status: 400, message: 'ID de paciente inválido' };
    }
    return idNum;
  }

  /**
   * Maneja errores durante la creación de episodios
   */
  static manejarErrorCreacion(res, error, file) {
    console.error('Error al crear episodio:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });

    // Limpiar archivo subido si hubo error
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

  /**
   * Verifica permisos para crear episodios
   */
  static async verificarPermisosCreacion(usuario, idPaciente) {
    if (!usuario) {
      throw { status: 401, message: 'Usuario no autenticado' };
    }
  
    if (usuario.tipo_usuario === 'Administrador') return true;
  
    if (usuario.tipo_usuario === 'Familiar') {
      const esCuidador = await this._verificarCuidador(usuario.id_usuario, idPaciente);
      if (!esCuidador) {
        throw { 
          status: 403, 
          message: 'Solo los cuidadores registrados pueden crear episodios' 
        };
      }
      return true;
    }
  
    if (usuario.tipo_usuario === 'Usuario') {
      const paciente = await Paciente.findOne({
        where: { id_paciente: idPaciente, id_usuario: usuario.id_usuario }
      });
      if (!paciente) {
        throw {
          status: 403,
          message: 'Solo el propietario del paciente puede crear episodios'
        };
      }
      return true;
    }
  
    throw { 
      status: 403, 
      message: 'No tienes permisos para crear episodios' 
    };
  }

  /**
   * Verifica permisos para editar episodios
   */
  static verificarPermisosEdicion(episodio, usuario) {
    if (episodio.registrado_por !== usuario.id_usuario && 
        usuario.tipo_usuario !== 'Administrador') {
      throw { 
        status: 403, 
        message: 'Solo el creador o administrador puede modificar este episodio' 
      };
    }
  }

  /**
   * Verifica acceso a los episodios de un paciente
   */
  static async verificarAccesoEpisodios(usuario, idPaciente) {
    if (usuario.tipo_usuario === 'Administrador') return true;

    if (usuario.tipo_usuario === 'Paciente') {
      const paciente = await Paciente.findOne({ 
        where: { id_usuario: usuario.id_usuario } 
      });
      if (!paciente || paciente.id_paciente !== parseInt(idPaciente)) {
        throw { 
          status: 403, 
          message: 'No tienes permiso para ver estos episodios' 
        };
      }
      return true;
    }

    if (usuario.tipo_usuario === 'Familiar') {
      const tieneAcceso = await this._verificarCuidador(usuario.id_usuario, idPaciente);
      if (!tieneAcceso) {
        throw { 
          status: 403, 
          message: 'No tienes permiso para ver estos episodios' 
        };
      }
      return true;
    }

    throw { 
      status: 403, 
      message: 'Acceso no autorizado' 
    };
  }

  /**
   * Envía una respuesta exitosa estandarizada
   */
  static responderExito(res, status, message, data = null) {
    const response = { success: true, message };
    if (data) response.data = data;
    res.status(status).json(response);
  }

  /**
   * Verifica si un usuario es cuidador de un paciente
   */
  static async _verificarCuidador(idUsuario, idPaciente) {
    const count = await Familiar.count({
      where: { id_usuario: idUsuario, id_paciente: idPaciente }
    });
    return count > 0;
  }
}