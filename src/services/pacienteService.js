import Paciente from "../models/paciente.model.js";

export const createPaciente = async ({
  id_usuario,
  nombre,
  apellido,
  fecha_nacimiento,
  sexo,
  diagnostico_principal,
  nivel_autonomia
}) => {
  try {
    const paciente = await Paciente.create({
      id_usuario,
      nombre,
      apellido,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    })
  
    return paciente;
  } catch (error) {
    console.log(error);    
  }
}