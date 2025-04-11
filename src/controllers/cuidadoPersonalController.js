import { registrarCuidadoPersonal, obtenerCuidadosPorPaciente } from '../services/cuidadoPersonalService.js';
import { obtenerReporteCuidadoPersonal, detectarAumentoAsistencia } from '../services/reporteCuidadoService.js';


// Registrar un nuevo cuidado personal
export const crearCuidadoPersonal = async (req, res) => {
  try {
    const { id_paciente, tipo_cuidado, descripcion_cuidado, nivel_asistencia, observaciones } = req.body;

    if (!id_paciente || !tipo_cuidado || !nivel_asistencia) {
      return res.status(400).json({ message: 'Los campos tipo de cuidado y nivel de asistencia son obligatorios' });
    }

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
