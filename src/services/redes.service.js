import { models } from "../models/index.js";
const { Red, UsuarioRed, Usuario } = models;
import { Op } from "sequelize";
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

export const actualiza = async (id_red, nombre_red, descripcion_red, imagen_red) => {
    try {
        const redActualizada = await Red.update(
            { nombre_red, descripcion_red, imagen_red },
            { where: { id_red } }
        );
        return redActualizada;
    } catch (error) {
        console.error("Error al actualizar la red:", error);
        throw error;
    }
}

export const buscarRedPorNombre = async (nombre_red) => {
    try {
        const red = await Red.findAll({
            where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("nombre_red")),
            { [Op.like]: `%${nombre_red.toLowerCase()}%` }
      )
        });
        return red;
    } catch (error) {
        console.error("Error al buscar la red por nombre:", error);
        throw error;
    }
}
   