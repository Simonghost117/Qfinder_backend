import { createPaciente, getPacientesByUsuario } from "../services/pacienteService.js";

import { models } from "../models/index.js";
const { Paciente, Familiar } = models;


// Registrar un nuevo paciente
export const register = async (req, res) => {
  try {
    const id_usuario = req.usuario.id;

    // Desestructurar solo los campos esperados desde el body
    const {
      nombre,
      apellido,
      identificacion,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    } = req.body;
    console.log("Datos recibidos:", req.body);

    const pacienteExistente = await Paciente.findOne({
      where: { identificacion, id_usuario }
    });

    if (pacienteExistente) {
      return res.status(400).json({
        success: false,
        message: "Este usuario ya registró un paciente con la misma identificación."
      });
    };

    const pacienteData = {
      id_usuario,
      nombre,
      apellido,
      identificacion,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    };

    // Crear paciente
    const paciente = await createPaciente(pacienteData);

    res.status(201).json({
      success: true,
      message: "Paciente registrado exitosamente",
      data: {
        paciente: {
          id: paciente.id_paciente,
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          identificacion: paciente.identificacion,
          diagnostico: paciente.diagnostico_principal
        },
        relacion_automatica: {
          tipo: 'familiar_cuidador_principal',
          parentesco: 'tutor'
        }
      }
    });
  } catch (error) {
    console.error("Error en register:", error.message);

    if (error.message === "Un usuario solo puede registrar hasta 5 pacientes.") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar el paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Listar pacientes por usuario
export const listarPacientes = async (req, res) => {
  try {
    const id_usuario = req.usuario.id;
  
    const pacientes = await getPacientesByUsuario(id_usuario);

    const pacientesFormateados = pacientes.map(p => ({
      id: p.id_paciente,
      nombre: p.nombre,
      apellido: p.apellido,
      identificacion: p.identificacion,
      fecha_nacimiento: p.fecha_nacimiento,
      sexo: p.sexo,
      diagnostico_principal: p.diagnostico_principal,
      es_cuidador_principal: p.Familiars?.some(f => f.cuidador_principal) || false,
      parentesco: p.Familiars?.[0]?.parentesco || 'tutor'
    }));

    res.status(200).json({
      success: true,
      data: pacientesFormateados
    });
  } catch (error) {
    console.error("Error en listarPacientes:", error);
    res.status(500).json({
      success: false,
      message: 'Error al listar pacientes',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

export const getPacienteById = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    console.log("ID del paciente:", req.params.id_paciente);
    const paciente = await Paciente.findOne({
      where: { id_paciente: id_paciente },
      include: [{
        model: Familiar,
        as: 'familiares',
        required: false
      }]
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "Paciente no encontrado."
      });
    }

    res.status(200).json({
      success: true,
      data: paciente
    });
  } catch (error) {
    console.error("Error en getPacienteById:", error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const { nombre, apellido, fecha_nacimiento, sexo, diagnostico_principal, nivel_autonomia } = req.body;

    // Verificar si el paciente existe
    const paciente = await Paciente.findByPk(id_paciente);
    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "Paciente no encontrado."
      });
    }

    // Actualizar el paciente
    await Paciente.update({
      nombre,
      apellido,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    }, {
      where: { id_paciente }
    });

    res.status(200).json({
      success: true,
      message: "Paciente actualizado exitosamente.",
      data: {
        id: id_paciente,
        nombre,
        apellido,
        identificacion: paciente.identificacion,
        fecha_nacimiento,
        sexo,
        diagnostico_principal,
        nivel_autonomia
      }
    });
  } catch (error) {
    console.error("Error en actualizarPaciente:", error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}

export const eliminarPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;

    // Verificar si el paciente existe
    const paciente = await Paciente.findByPk(id_paciente);
    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "Paciente no encontrado."
      });
    }

    // Eliminar el paciente
    await Paciente.destroy({
      where: { id_paciente }
    });

    res.status(200).json({
      success: true,
      message: "Paciente eliminado exitosamente."
    });
  }
  catch (error) {
    console.error("Error en eliminarPaciente:", error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}