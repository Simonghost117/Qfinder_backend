import { createFamiliar } from "../services/familiarService.js";
import {Familiar} from "../models/Familiar.js";
import  Paciente from "../models/paciente.model.js";

export const register = async (req, res) => {
  try {
    const familiar = await createFamiliar(req.body)

    res.status(201).json({
      message: "Familiar Registrado exitosamente"
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al registrar el familiar',
      error
    });
  }
}

export const listarFamiliares = async (req, res) => {
  try {
    const familiares = await Familiar.findAll({
      attributes: ['id_familiar', 'id_usuario', 'id_paciente', 'parentesco', 'cuidador_principal', 'notificado_emergencia'],
      include: [
        {
          model: Paciente,
          as: 'paciente_principal', // 🔹 Asegúrate de que este alias coincide con el modelo
          attributes: ['id_paciente', 'nombre', 'apellido', 'fecha_nacimiento']
        }
      ]
    });

    res.status(200).json(familiares);
  } catch (error) {
    console.error("Error al listar familiares:", error);
    res.status(500).json({
      message: 'Error interno al listar los familiares',
      error: error.message
    });
  }
};



/*
{
  "id_usuario": 1,
  "id_paciente": 1,
  "parentesco": "abuelo",
  "cuidador_principal": 1,
  "notificado_emergencia": 1,
}
*/
