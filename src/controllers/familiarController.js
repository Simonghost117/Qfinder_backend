import { createFamiliar } from "../services/familiarService.js";
import Familiar from "../models/familiar.model.js";

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

/*
{
  "id_usuario": 1,
  "id_paciente": 1,
  "parentesco": "abuelo",
  "cuidador_principal": 1,
  "notificado_emergencia": 1,
}
*/