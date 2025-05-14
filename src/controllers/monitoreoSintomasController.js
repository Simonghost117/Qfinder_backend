import { MonitoreoSintomasService } from '../services/monitoreoSintomas.service.js';
import { RegistroSintoma } from '../models/MonitoreoSintomas.js';
import { handleError } from '../utils/errorHandler.js';
import { Familiar } from '../models/Familiar.js';
import Paciente from '../models/paciente.model.js';

export class MonitoreoSintomasController {
  static async registrarSintoma(req, res) {
    try {
      const id_paciente = parseInt(req.params.id_paciente);

      // Preparar los datos a registrar
      const datos = {
        id_paciente,
        sintoma: req.body.sintoma,
        gravedad: parseInt(req.body.gravedad || 3),
        observaciones: req.body.observaciones || null,
        fecha_sintoma: req.body.fecha_sintoma || new Date()
      };

      // Registrar el síntoma
      const sintomaRegistrado = await MonitoreoSintomasService.registrarSintoma(datos);

      // Responder con el síntoma registrado
      return res.status(201).json({
        success: true,
        message: 'Síntoma registrado exitosamente',
        data: {
          id: sintomaRegistrado.id_registro,
          sintoma: sintomaRegistrado.sintoma,
          gravedad: sintomaRegistrado.gravedad,
          fecha: sintomaRegistrado.fecha_sintoma
        }
      });
    } catch (error) {
      handleError(res, error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el síntoma',
        error: error.message
      });
    }
  }

  static async obtenerSintomasPaciente(req, res) {
    try {
      const id_paciente = parseInt(req.params.id_paciente);
  
      // Obtener los síntomas del paciente sin validar acceso
      const registros = await MonitoreoSintomasService.obtenerPorPaciente(id_paciente);

      if (!registros || registros.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron síntomas para este paciente'
        });
      }
  
      // Responder con los registros
      return res.status(200).json({
        success: true,
        message: 'Síntomas obtenidos exitosamente',
        data: registros
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los síntomas',
        error: error.message
      });
      handleError(res, error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los síntomas',
        error: error.message
      });
    }
  }
  static async obtenerSintomaPorId(req, res) {
    try {
      const id_paciente = parseInt(req.params.id_paciente);
      const id_registro = parseInt(req.params.id_registro);
      const usuario = req.usuario; 
      console.log("Datos del usuario autenticado:", req.usuario);

      // Obtener el síntoma por ID
      const sintoma = await MonitoreoSintomasService.obtenerSintomaPorId(id_paciente, id_registro);
      console.log('sintoma', sintoma);

      if (!sintoma || sintoma.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Síntoma no encontrado'
        });
      }

      // Responder con el síntoma
      return res.status(200).json({
        success: true,
        message: 'Síntoma obtenido exitosamente',
        data: sintoma
      });
    } catch (error) {
      handleError(res, error);
    }
  }
  static async actualizarSintoma(req, res) {
    try {
      const id_paciente = parseInt(req.params.id_paciente);
      const id_registro = parseInt(req.params.id_registro);

      // Preparar los datos a actualizar
      const datos = {
        sintoma: req.body.sintoma,
        gravedad: parseInt(req.body.gravedad || 3),
        observaciones: req.body.observaciones || null,
        fecha_sintoma: req.body.fecha_sintoma || new Date()
      };

      const traerreg = await MonitoreoSintomasService.obtenerSintomaPorId(id_paciente, id_registro);
      if (!traerreg || traerreg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Síntoma no encontrado'
        });
      }

      // Actualizar el síntoma
      const sintomaActualizado = await MonitoreoSintomasService.actualizarSintoma(id_paciente, id_registro, datos);

      // Responder con el síntoma actualizado
      return res.status(200).json({
        success: true,
        message: 'Síntoma actualizado exitosamente',
        data: sintomaActualizado
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  static async eliminarSintoma(req, res) {
    try {
      const id_paciente = parseInt(req.params.id_paciente);
      const id_registro = parseInt(req.params.id_registro);

      // Verificar si el síntoma existe
      const sintoma = await MonitoreoSintomasService.obtenerSintomaPorId(id_paciente, id_registro);
      if (!sintoma || sintoma.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Síntoma no encontrado'
        });
      }

      // Eliminar el síntoma
      await MonitoreoSintomasService.eliminarSintoma(id_paciente, id_registro);

      // Responder con éxito
      return res.status(200).json({
        success: true,
        message: 'Síntoma eliminado exitosamente'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
  

  static async verificarAcceso(usuario, idPaciente) {
    if (usuario.tipo_usuario === 'Administrador') return true;

    if (usuario.tipo_usuario === 'Paciente') {
      const paciente = await Paciente.findOne({ where: { id_usuario: usuario.id_usuario } });
      if (!paciente || paciente.id_paciente !== parseInt(idPaciente)) {
        throw { status: 403, message: 'No tienes acceso a estos registros' };
      }
      return true;
    }

    if (usuario.tipo_usuario === 'Familiar') {
      const esCuidador = await this._verificarCuidador(usuario.id_usuario, idPaciente);
      if (!esCuidador) {
        throw { status: 403, message: 'No tienes acceso a estos registros' };
      }
      return true;
    }

    throw { status: 403, message: 'Acceso no autorizado' };
  }

  static async _verificarCuidador(idUsuario, idPaciente) {
    const count = await Familiar.count({
      where: { id_usuario: idUsuario, id_paciente: idPaciente }
    });
    return count > 0;
  }
}
