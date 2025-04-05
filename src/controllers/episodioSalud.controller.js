import { EpisodioSaludService } from '../services/episodioSalud.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EpisodioSaludController {
  // Métodos principales
  static async crearEpisodio(req, res) {
    try {
      const { id_paciente } = req.params;
      const datosEpisodio = await this.prepararDatosCreacion(req);
      
      await this.verificarPermisosCreacion(req.user, id_paciente);
      
      const nuevoEpisodio = await EpisodioSaludService.crear(datosEpisodio);
      await this.notificarSiEsNecesario(nuevoEpisodio);
      
      this.responderExito(res, 201, 'Episodio registrado exitosamente', nuevoEpisodio);
    } catch (error) {
      handleError(res, error);
    }
  }

  static async obtenerEpisodiosPaciente(req, res) {
    try {
      const { id_paciente } = req.params;
      
      await this.verificarAccesoEpisodios(req.user, id_paciente);
      const episodios = await EpisodioSaludService.obtenerPorPaciente(id_paciente);
      
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
      const episodioActualizado = await EpisodioSaludService.actualizar(id_episodio, datosActualizados);
      
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
      await EpisodioSaludService.eliminar(id_episodio);
      
      this.responderExito(res, 200, 'Episodio eliminado exitosamente');
    } catch (error) {
      handleError(res, error);
    }
  }

  // Métodos auxiliares privados
  static async prepararDatosCreacion(req) {
    const { id_paciente } = req.params;
    const { tipo, sintomas, descripcion, severidad = 3 } = req.body;
    
    return {
      id_paciente,
      tipo,
      fecha_hora_inicio: new Date(),
      severidad: parseInt(severidad),
      sintomas: JSON.parse(sintomas),
      descripcion,
      multimedia: this.obtenerRutaMultimedia(req.file),
      registrado_por: req.user.id_usuario,
      registrado_por_role: 'Familiar',
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
      datosActualizados.sintomas = JSON.parse(datosActualizados.sintomas);
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
      await new NotificacionesService().notificarCuidadores(episodio);
    }
  }

  static async obtenerYVerificarEpisodio(idEpisodio, usuario) {
    const episodio = await EpisodioSaludService.obtenerPorId(idEpisodio);
    if (!episodio) throw { status: 404, message: 'Episodio no encontrado' };
    
    await this.verificarAccesoEpisodios(usuario, episodio.id_paciente);
    return episodio;
  }

  static async verificarPermisosCreacion(usuario, idPaciente) {
    const esCuidador = await this._verificarCuidador(usuario.id_usuario, idPaciente);
    if (!esCuidador) {
      throw { 
        status: 403, 
        message: 'Solo los cuidadores registrados pueden crear episodios' 
      };
    }
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