import { models } from "../models/index.js";
const { Paciente, Familiar } = models;


export const createPaciente = async ({
  id_usuario,
  nombre,
  apellido,
  identificacion,
  fecha_nacimiento,
  sexo,
  diagnostico_principal,
  nivel_autonomia
}) => {
  try {
    const usuario = await models.Usuario.findByPk(id_usuario);
    if (!usuario) {
      throw new Error("Usuario no encontrado.");
    }
    // Verificar límite de pacientes
    const totalPacientes = await Paciente.count({ where: { id_usuario } });

    if (usuario.membresia == 'free'){
      if (totalPacientes >= 2) {
        throw new Error("Un usuario free solo puede registrar hasta 2 pacientes.");
      }
    } else if (id_usuario.membresia == 'plus'){
      if (totalPacientes >= 5) {
        throw new Error("Un usuario plus solo puede registrar hasta 5 pacientes.");
      }
    } else if (id_usuario.membresia == 'pro'){
      if (totalPacientes >= 10) {
        throw new Error("Un usuario pro solo puede registrar hasta 10 pacientes.");
      }
    }

    // Crear el paciente
    const paciente = await Paciente.create({
      id_usuario,
      nombre,
      apellido,
      identificacion,
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