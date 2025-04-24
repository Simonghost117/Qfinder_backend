import { createPaciente } from "../services/pacienteService.js";
import Paciente from '../models/paciente.model.js';

export const register = async (req, res) => {
  try {

    const id_usuario = req.usuario.id; // Obtener el id del usuario desde el token
    console.log("ID de usuario:", id_usuario);

    

    const info = { id_usuario, ...req.body,  }; // Agregar el id_usuario al cuerpo de la solicitud
    const paciente = await createPaciente(info);

    res.status(201).json({
      message: "Paciente Registrado exitosamente",
      paciente: {
        id_usuario: paciente.id_usuario,
        id_paciente: paciente.id_paciente,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
      }
    })
  } catch (error) {
    console.error("Error al registrar el paciente:", error.message);

    // Si el error es por límite de pacientes, enviar respuesta clara
    if (error.message === "Un usuario solo puede registrar hasta 5 pacientes.") {
      return res.status(400).json({ message: error });
    }

    res.status(500).json({ message: 'Error interno al registrar el paciente', error: error.message });
  }

}

export const listarPacientes = async (req, res) => {
  try {
    const id_usuario = req.usuario.id; // Obtener el id del usuario desde el token
    console.log("ID de usuario:", id_usuario);

    const pacientes = await Paciente.findAll({
      where: { id_usuario: id_usuario },
    });

    res.status(200).json(pacientes);
  } catch (error) {
    res.status(500).json({
      message: 'Error al listar los pacientes',
      error
    });
  }
};

/*
{
  "nombre": "Juan",
  "apellido": "Moriones",
  "fecha_nacimiento": "1997-09-05",
  "sexo": "masculino",
  "diagnostico_principal": "Huye como loco",
  "nivel_autonomia": "baja"
}
*/