import e from 'express';
import { registrarCuidadoPersonal, obtenerCuidadosPorPaciente, actualizarCuidadoPersonal, eliminarCuidadoPersonal, obtenerCuidadoId } from '../services/cuidadoPersonalService.js';
import { obtenerReporteCuidadoPersonal, detectarAumentoAsistencia } from '../services/reporteCuidadoService.js';


// Registrar un nuevo cuidado personal
export const crearCuidadoPersonal = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const { tipo_cuidado, descripcion_cuidado, nivel_asistencia, observaciones } = req.body;

    // if (!id_paciente || !tipo_cuidado || !nivel_asistencia) {
    //   return res.status(400).json({ message: 'Los campos tipo de cuidado y nivel de asistencia son obligatorios' });
    // }

    const nuevoRegistro = await registrarCuidadoPersonal({
      id_paciente,
      tipo_cuidado,
      descripcion_cuidado,
      nivel_asistencia,
      observaciones
    });

    res.status(201).json({ message: 'Registro guardado exitosamente', data: nuevoRegistro });
  } catch (error) {
    console.error('Error al registrar cuidado personal:', error);
    res.status(500).json({ message: 'Error al guardar el registro' });
  }
};

// Obtener registros de cuidado personal por paciente
export const getCuidadosPorPaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;

    const registros = await obtenerCuidadosPorPaciente(idPaciente);

    if (!registros || registros.length === 0) {
      return res.status(404).json({ message: 'No se encontraron registros de cuidado personal' });
    }

    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener los cuidados personales:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getReporteCuidadoPersonal = async (req, res) => {
    try {
      const { idPaciente } = req.params;
  
      const [reporte, hayAumento] = await Promise.all([
        obtenerReporteCuidadoPersonal(idPaciente),
        detectarAumentoAsistencia(idPaciente)
      ]);
  
      res.status(200).json({
        mensaje: 'Reporte generado exitosamente',
        reporte,
        alerta: hayAumento ? '¡Atención! Aumentó la necesidad de asistencia' : null
      });
    } catch (error) {
      console.error('Error al obtener el reporte:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };

  export const updateCuidadoPersonal = async (req, res) => {
    try {
        const { idCuidado } = req.params;
        const { tipo_cuidado, descripcion_cuidado, nivel_asistencia, observaciones } = req.body;

        // Validar que se haya proporcionado un ID de cuidado
        if (!idCuidado) {
            return res.status(400).json({ message: 'ID de cuidado es requerido' });
        }

        // Actualizar el registro de cuidado personal
        const updatedRegistro = await actualizarCuidadoPersonal(idCuidado, {
            tipo_cuidado,
            descripcion_cuidado,
            nivel_asistencia,
            observaciones
        });

        if (!updatedRegistro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }

        res.status(200).json({ message: 'Registro actualizado exitosamente', data: updatedRegistro });
    } catch (error) {
        console.error('Error al actualizar el registro de cuidado personal:', error);
        res.status(500).json({ message: 'Error al actualizar el registro' });
    }
  };

  export const deleteCuidadoPersonal = async (req, res) => {
    try {
        const { idPaciente, idCuidado } = req.params;

        // Validar que se haya proporcionado un ID de cuidado
        if (!idCuidado || !idPaciente) {
            return res.status(400).json({ message: 'Registre correctamente los campos requeridos' });
        }

        // Eliminar el registro de cuidado personal
        const deletedRegistro = await eliminarCuidadoPersonal(idPaciente, idCuidado);

        if (!deletedRegistro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }

        res.status(200).json({ message: 'Registro eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar el registro de cuidado personal:', error);
        res.status(500).json({ message: 'Error al eliminar el registro' });
    }
  }

  export const cuidadoId = async (req, res) => {
    try {
        const { idPaciente, idCuidado } = req.params;

        // Validar que se haya proporcionado un ID de cuidado
        if (!idCuidado || !idPaciente) {
            return res.status(400).json({ message: 'Registre correctamente los campos requeridos' });
        }

        // Obtener el registro de cuidado personal por ID
        const registro = await obtenerCuidadoId(idPaciente, idCuidado);

        if (!registro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }

        res.status(200).json(registro);
    } catch (error) {
        console.error('Error al obtener el registro de cuidado personal:', error);
        res.status(500).json({ message: 'Error al obtener el registro' });
    }
  }