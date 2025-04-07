import { createPaciente } from "../services/pacienteService.js";
import Paciente from '../models/paciente.model.js';

export const register = async (req, res) => {
  try {
    const paciente = await createPaciente(req.body)

    res.status(201).json({
      message: "Paciente Registrado exitosamente",
      paciente: {
        id: paciente.id_paciente,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
      }
    })
  } catch (error) {
    res.status(500).json({
      message: 'Error al registrar el paciente',
      error
    });
  }
}

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