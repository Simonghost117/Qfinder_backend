import {Familiar} from "../models/Familiar.js";

export const createFamiliar = async (body) => {
  try {
    const {
      id_usuario,
      id_paciente,
      parentesco,
      cuidador_principal,
      notificado_emergencia
    } = body;
    
    const familiar = await Familiar.create({
      id_usuario,
      id_paciente,
      parentesco,
      cuidador_principal,
      notificado_emergencia
    });

    return familiar;
  } catch (error) {
    console.log(error);
  }
}