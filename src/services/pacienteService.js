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

    const totalPacientes = await Paciente.count({ where: { id_usuario: id_usuario } });

    if (totalPacientes >= 5) {
      throw new Error("Un usuario solo puede registrar hasta 5 pacientes.");
    }

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