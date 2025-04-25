// import Paciente from "../models/paciente.model.js";
// import { Familiar } from "../models/Familiar.js";
import { models } from "../models/index.js";
const { Paciente, Familiar } = models;


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
    // Verificar límite de pacientes
    const totalPacientes = await Paciente.count({ where: { id_usuario } });

    if (totalPacientes >= 5) {
      throw new Error("Un usuario solo puede registrar hasta 5 pacientes.");
    }

    // Crear el paciente
    const paciente = await Paciente.create({
      id_usuario,
      nombre,
      apellido,
      fecha_nacimiento,
      sexo,
      diagnostico_principal,
      nivel_autonomia
    });

    // Registrar automáticamente al usuario como familiar/cuidador principal
    await Familiar.create({
      id_usuario,
      id_paciente: paciente.id_paciente,
      parentesco: 'tutor', // O 'responsable' según tu necesidad
      cuidador_principal: true,
      notificado_emergencia: true
    });

    return {
      ...paciente.get({ plain: true }),
      relacion_automatica: {
        tipo: 'familiar_cuidador_principal',
        parentesco: 'tutor'
      }
    };
  } catch (error) {
    console.error("Error en createPaciente:", error);
    throw error; // Re-lanzar el error para manejarlo en el controlador
  }
};

// Función adicional para obtener pacientes con sus relaciones
// export const getPacientesByUsuario = async (id_usuario) => {
//   return await Paciente.findAll({
//     where: { id_usuario },
//     include: [{
//       model: Familiar,
//       where: { id_usuario },
//       required: false
//     }]
//   });
// };

export const getPacientesByUsuario = async (id_usuario) => {
  const pacientes = await Paciente.findAll({
    where: { id_usuario },
    include: [{
      model: Familiar,
      as: "familiares", // Alias debe coincidir con el definido en la relación
      required: false,
    }],
  });

  console.log("Pacientes encontrados:", pacientes);
  return pacientes;
};