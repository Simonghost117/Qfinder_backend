import { EpisodioSaludService } from '../services/episodioSalud.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { Familiar, Paciente } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EpisodioSaludController {
  static async crearEpisodio(req, res) {
    try {
      // Extraer el ID del paciente de la URL
      const id_paciente = parseInt(req.params.id_paciente);
      
      // Verificar permisos antes de continuar
      try {
        await this.verificarPermisosCreacion(req.user, id_paciente);
      } catch (permError) {
        return res.status(permError.status || 403).json({
          success: false,
          message: permError.message || 'No tienes permisos para crear episodios'
        });
      }
      
      // Crear objeto de datos directamente desde req.body
      const datos = {
        id_paciente,
        ...req.body,
        // Asegurar que los campos estén en el formato correcto
        fecha_hora_inicio: req.body.fecha_hora_inicio || new Date(),
        severidad: parseInt(req.body.severidad || 3),
        sintomas: typeof req.body.sintomas === 'string' ? JSON.parse(req.body.sintomas) : (req.body.sintomas || []),
        multimedia: req.file ? path.relative(__dirname, req.file.path) : null,
        registrado_por: req.user.id_usuario,
        registrado_por_role: req.user.tipo_usuario,
        estado: 'activo',
        origen: req.body.origen || 'cuidador'
      };

      console.log("Datos enviados al servicio:", JSON.stringify(datos, null, 2));
      
      // Llamar al servicio para crear el episodio
      const episodio = await EpisodioSaludService.crearEpisodio(datos);
      
      // // Notificar si es necesario
      // if (episodio.severidad >= 5 || episodio.origen === 'paciente') {
      //   await NotificacionesService.notificarCuidadores(episodio);
      // }
      
      // Devolver respuesta de éxito
      return res.status(201).json({
        success: true,
        message: 'Episodio creado exitosamente',
        data: {
          id: episodio.id_episodio,
          tipo: episodio.tipo,
          severidad: episodio.severidad,
          fecha_hora_inicio: episodio.fecha_hora_inicio
        }
      });
    } catch (error) {
      console.error('Error detallado al crear episodio:', {
        name: error.name,
        message: error.message,
        errors: error.errors?.map(e => e.message),
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  static async obtenerEpisodiosPaciente(req, res) {
    try {
      const { id_paciente } = req.params;

      await this.verificarAccesoEpisodios(req.user, id_paciente);
      const episodios = await EpisodioSaludService.obtenerPorPaciente(id_paciente, req.user.tipo_usuario);

      this.responderExito(res, 200, 'Episodios obtenidos exitosamente', episodios);
    } catch (error) {
      handleError(res, error);
    }
  }

  static async obtenerEpisodio(req, res) {
    try {
      const { id_episodio } = req.params;
      const episodio = await this.obtenerYVerificarEpisodio(id_episodio, req.user);

      this.responderExito(res, 200, 'Episodio obtenido exitosamente', episodio);
    } catch (error) {
      handleError(res, error);
    }
  }

  static async actualizarEpisodio(req, res) {
    try {
      const { id_episodio } = req.params;
      const episodioExistente = await this.obtenerYVerificarEpisodio(id_episodio, req.user);
      this.verificarPermisosEdicion(episodioExistente, req.user);

      const datosActualizados = await this.prepararDatosActualizacion(req, episodioExistente);
      const episodioActualizado = await EpisodioSaludService.actualizarEpisodio(id_episodio, datosActualizados);

      this.responderExito(res, 200, 'Episodio actualizado exitosamente', episodioActualizado);
    } catch (error) {
      handleError(res, error);
    }
  }

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

  // Métodos auxiliares
  static async prepararDatosCreacion(req) {
    const id_paciente = parseInt(req.params.id_paciente);
    const { tipo, sintomas, descripcion, severidad = 3 } = req.body;

    // Parsear los síntomas si vienen como string
    const parsedSintomas = typeof sintomas === 'string' ? JSON.parse(sintomas) : sintomas;

    return {
      id_paciente,
      tipo,
      fecha_hora_inicio: new Date(),
      severidad: parseInt(severidad),
      sintomas: parsedSintomas,
      descripcion,
      multimedia: this.obtenerRutaMultimedia(req.file),
      registrado_por: req.user.id_usuario,
      registrado_por_role: req.user.tipo_usuario,
      estado: 'activo',
      origen: 'cuidador'
    };
  }

  static async prepararDatosActualizacion(req, episodioExistente) {
    const datosActualizados = req.body;

    if (req.file) {
      await this.eliminarMultimedia(episodioExistente);
      datosActualizados.multimedia = this.obtenerRutaMultimedia(req.file);
    }

    if (datosActualizados.sintomas) {
      datosActualizados.sintomas = typeof datosActualizados.sintomas === 'string'
        ? JSON.parse(datosActualizados.sintomas)
        : datosActualizados.sintomas;
    }

    return datosActualizados;
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
    if (episodio.severidad >= 5) {
      await NotificacionesService.notificarCuidadores(episodio);
    }
  }

  static async obtenerYVerificarEpisodio(idEpisodio, usuario) {
    const episodio = await EpisodioSaludService.obtenerPorId(idEpisodio);
    if (!episodio) throw { status: 404, message: 'Episodio no encontrado' };

    await this.verificarAccesoEpisodios(usuario, episodio.id_paciente);
    return episodio;
  }

  static async verificarPermisosCreacion(usuario, idPaciente) {
    if (!usuario) {
      throw { status: 401, message: 'Usuario no autenticado' };
    }
    
    // Si es administrador, siempre permitir
    if (usuario.tipo_usuario === 'Administrador') return true;
    
    // Para familiares, verificar si son cuidadores del paciente
    if (usuario.tipo_usuario === 'Familiar') {
      const esCuidador = await this._verificarCuidador(usuario.id_usuario, idPaciente);
      if (!esCuidador) {
        throw { status: 403, message: 'Solo los cuidadores registrados pueden crear episodios' };
      }
      return true;
    }
    
    // Para otros tipos de usuario, no permitir
    throw { status: 403, message: 'No tienes permisos para crear episodios' };
  }

  static verificarPermisosEdicion(episodio, usuario) {
    if (episodio.registrado_por !== usuario.id_usuario && usuario.tipo_usuario !== 'Administrador') {
      throw { 
        status: 403, 
        message: 'Solo el creador o administrador puede modificar este episodio' 
      };
    }
  }

  static async verificarAccesoEpisodios(usuario, idPaciente) {
    if (usuario.tipo_usuario === 'Administrador') return true;

    if (usuario.tipo_usuario === 'Paciente') {
      const paciente = await Paciente.findOne({ where: { id_usuario: usuario.id_usuario } });
      if (!paciente || paciente.id_paciente !== parseInt(idPaciente)) {
        throw { status: 403, message: 'No tienes permiso para ver estos episodios' };
      }
      return true;
    }

    if (usuario.tipo_usuario === 'Familiar') {
      const tieneAcceso = await this._verificarCuidador(usuario.id_usuario, idPaciente);
      if (!tieneAcceso) {
        throw { status: 403, message: 'No tienes permiso para ver estos episodios' };
      }
      return true;
    }

    throw { status: 403, message: 'Acceso no autorizado' };
  }

  static responderExito(res, status, message, data = null) {
    const response = { success: true, message };
    if (data) response.data = data;
    res.status(status).json(response);
  }

  static async _verificarCuidador(idUsuario, idPaciente) {
    const count = await Familiar.count({
      where: { id_usuario: idUsuario, id_paciente: idPaciente }
    });
    return count > 0;
  }
}