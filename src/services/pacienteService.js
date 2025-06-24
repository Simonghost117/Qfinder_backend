import { models } from "../models/index.js";
const { Paciente, Familiar, Usuario } = models;
import { Op } from "sequelize";

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


export const buscarNombre = async (nombre, pagination, req) => {
  try {
    const { page, pageSize, offset } = pagination;

    const { count, rows } = await Paciente.findAndCountAll({
      where: {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${nombre}%` } },
          { apellido: { [Op.iLike]: `%${nombre}%` } },
          { identificacion: { [Op.iLike]: `%${nombre}%` } },
        ],
      },
      attributes: [
        'id_paciente',
        'nombre',
        'apellido',
        'identificacion',
        'fecha_nacimiento',
        'sexo',
        'diagnostico_principal',
        'imagen_paciente',
      ],
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: [
            'nombre_usuario',
            'apellido_usuario',
            'correo_usuario'
          ],
          required: true,
        },
      ],
      order: [['id_paciente', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true
    });

    const data = rows.map(paciente => ({
      id_paciente: paciente.id_paciente,
      nombre_paciente: paciente.nombre,
      apellido_paciente: paciente.apellido,
      identificacion_paciente: paciente.identificacion,
      fecha_nacimiento: paciente.fecha_nacimiento,
      sexo: paciente.sexo,
      diagnostico_principal: paciente.diagnostico_principal,
      imagen_paciente: paciente.imagen_paciente,
      usuario: paciente.usuario ? {
        nombre_usuario: paciente.usuario.nombre_usuario,
        apellido_usuario: paciente.usuario.apellido_usuario,
        correo_usuario: paciente.usuario.correo_usuario
      } : null
    }));


    const totalPages = Math.ceil(count / pageSize);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;

    return {
      data,
      meta: {
        pagination: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: pageSize,
          totalPages,
          currentPage: page
        },
        links: {
          first: `${baseUrl}?page=1&pageSize=${pageSize}`,
          last: `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`,
          prev: page > 1 ? `${baseUrl}?page=${page - 1}&pageSize=${pageSize}` : null,
          next: page < totalPages ? `${baseUrl}?page=${page + 1}&pageSize=${pageSize}` : null
        }
      }
    };
  } catch (error) {
    console.error('Error al buscar usuario:', error);
    throw new Error(`Error en la búsqueda: ${error.message}`);
  }
};

