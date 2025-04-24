import { createPaciente, getPacientesByUsuario } from "../services/pacienteService.js";

// Registrar un nuevo paciente
export const register = async (req, res) => {
  try {
    const id_usuario = req.usuario.id;

    // Desestructurar solo los campos esperados desde el body
    const {
      nombre,
      apellido,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    } = req.body;

    const pacienteData = {
      id_usuario,
      nombre,
      apellido,
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
