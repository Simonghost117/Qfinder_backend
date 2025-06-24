import { models } from "../models/index.js";
const { Red, UsuarioRed, Usuario } = models;
import { Op, fn, col } from "sequelize";
import sequelize from "../config/db.js";

export const creacionRed = async (id_usuario, nombre_red, descripcion_red) => {
    try {
        // Crear la red
        const nuevaRed = await Red.create({
            id_usuario,
            nombre_red, 
            descripcion_red
        });

        // Registrar al creador como administrador
        const admin = await UsuarioRed.create({
            id_usuario: id_usuario,
            id_red: nuevaRed.id_red,
            rol: 'administrador',
            fecha_union: new Date()
        });

        // Obtener información adicional del usuario si es necesario
        const usuario = await Usuario.findByPk(id_usuario, {
            attributes: ['id_usuario', 'nombre_usuario', 'correo_usuario'] // Selecciona los campos que necesites
        });

        // Estructurar la respuesta combinada
        const respuesta = {
            red: {
                id_red: nuevaRed.id_red,
                nombre_red: nuevaRed.nombre_red,
                descripcion_red: nuevaRed.descripcion_red,
                fecha_creacion: nuevaRed.fecha_creacion
            },
            administrador: {
                id_usuario: admin.id_usuario,
                id_red: admin.id_red,
                rol: admin.rol,
                fecha_union: admin.fecha_union,
                usuario: { // Información del usuario
                    nombre: usuario.nombre_usuario,
                    email: usuario.correo_usuario
                    // otros campos que quieras incluir
                }
            }
        };

        return respuesta;
    } catch (error) {
        console.error("Error al crear la red:", error);
        throw error;
    }
}

export const actualiza = async (id_red, nombre_red, descripcion_red, nueva_imagen) => {
    try {
        const redActualizada = await Red.update(
            { nombre_red, descripcion_red, imagen_red: nueva_imagen },
            { where: { id_red } }
        );
        return redActualizada;
    } catch (error) {
        console.error("Error al actualizar la red:", error);
        throw error;
    }
}

// export const buscarRedPorNombre = async (nombre_red) => {
//     try {
//         const red = await Red.findAll({
//             where: sequelize.where(
//             sequelize.fn("LOWER", sequelize.col("nombre_red")),
//             { [Op.like]: `%${nombre_red.toLowerCase()}%` }
//       )
//         });
//         return red;
//     } catch (error) {
//         console.error("Error al buscar la red por nombre:", error);
//         throw error;
//     }
// }


// export const buscarRedPorNombre = async (nombre_red) => {
//     try {
//         const red = await Red.findAll({
//             where: {
//                 nombre_red: {
//                     [Op.iLike]: `%${nombre_red}%` // `ILIKE` funciona mejor en PostgreSQL sin `LOWER`
//                 }
//             },
//             order: [["nombre_red", "DESC"]] // Ordena resultados alfabéticamente
//         });

//         return red;
//     } catch (error) {
//         console.error("Error al buscar la red por nombre:", error);
//         throw error;
//     }
// };

export const buscarRedPorNombre = async (nombre_red) => {
    try {
        const redes = await Red.findAll({
            where: {
                nombre_red: {
                    [Op.iLike]: `%${nombre_red}%` // Búsqueda insensible a mayúsculas/minúsculas
                }
            },
            attributes: [
                "id_red",
                "nombre_red",
                "descripcion_red",
                [fn("COUNT", col("usuario_reds.id_usuario")), "total_integrantes"] // Cuenta integrantes
            ],
            include: [
                {
                    model: UsuarioRed,
                    attributes: [],
                }
            ],
            group: ["red.id_red"],
            order: [[fn("COUNT", col("usuario_reds.id_usuario")), "DESC"]] // Ordena por número de integrantes
        });

        return redes;
    } catch (error) {
        console.error("Error al buscar redes:", error);
        throw error;
    }
};



export const buscarNombre = async (nombre, pagination, req) => {
  try {
    const { page, pageSize, offset } = pagination;

    const { count, rows } = await Red.findAndCountAll({
      where: {
        [Op.or]: [
          { nombre_red: { [Op.iLike]: `%${nombre}%` } },
          { descripcion_red: { [Op.iLike]: `%${nombre}%` } },
        ],
      },
      attributes: [
        'id_red',
        'nombre_red',
        'descripcion_red'
      ],
      order: [['id_red', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true
    });

    const data = rows.map(red => ({
      id_red: red.id_red,
      nombre_red: red.nombre,
      descripcion_red: red.descripcion_red,
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

