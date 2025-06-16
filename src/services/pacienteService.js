import { models } from "../models/index.js";
const { Paciente, Familiar, Usuario } = models;


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
    const usuario = await models.Usuario.findByPk(id_usuario, {
      include: [{
        model: models.Subscription,
        as: 'subscription',
        where: { estado_suscripcion: 'active' },
        required: false
      }]
    });

    if (!usuario) {
      throw new Error("Usuario no encontrado.");
    }

    const totalPacientes = await models.Paciente.count({ where: { id_usuario } });

    // Determinar límite de pacientes
    let limitePacientes = 2; // Por defecto para plan 'free'

    if (usuario.subscription) {
      const { limite_pacientes } = usuario.subscription;

      if (typeof limite_pacientes === 'number') {
        limitePacientes = limite_pacientes;
      }
    }

    if (totalPacientes >= limitePacientes) {
      throw new Error(`Has alcanzado el límite de ${limitePacientes} pacientes permitido por tu plan.`);
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