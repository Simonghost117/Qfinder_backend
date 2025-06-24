import { Op } from 'sequelize';
import { models } from '../models/index.js';
const { Medicamento, Usuario } = models;

export const buscarNombre = async (nombre, pagination, req) => {
  try {
    const { page, pageSize, offset } = pagination;

    const { count, rows } = await Medicamento.findAndCountAll({
      where: {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${nombre}%` } },
          { tipo: { [Op.iLike]: `%${nombre}%` } },
        ],
      },
      attributes: [
        'id_medicamento',
        'nombre',
        'descripcion',
        'tipo'
      ],
      order: [['id_medicamento', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true
    });

    const data = rows.map(medicamento => ({
      id_medicamento: medicamento.id_medicamento,
      nombre: medicamento.nombre,
      tipo: medicamento.tipo,
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

