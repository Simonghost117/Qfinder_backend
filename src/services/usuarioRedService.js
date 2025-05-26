import { models } from '../models/index.js';
const { Red, UsuarioRed, Usuario } = models;

export const buscarRed = async ( id_red ) => {
    try {
        const red = await Red.findOne({
            where: {
                id_red
            }
        });
        return red;
    } catch (error) {
        throw new Error('Error al buscar la red');
    }
}


export const unirmeRed = async ( id_usuario, id_red) => {
    try {
        const nuevaUnion = await UsuarioRed.create({
            id_usuario,
            id_red,
            fecha_union: new Date()
        });

        return nuevaUnion;

    } catch (error) {
        throw new Error('Error al unirse a la red')
    }
}

export const listarRedesPorUsuario = async ( id_usuario ) => {
    try {
        const redesUsuario = await Usuario.findAll({
    where: { id_usuario },
    include: [{ model: Red }]
});

        return redesUsuario;

    } catch (error){
        console.error("Error al listar redes del usuario:", error);
        throw new Error("Error al obtener las redes");

    }
}

export const listarMembresia = async (id_red) => {
    try {
        const membresia = await UsuarioRed.findAll({
            where: { id_red },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id_usuario", "nombre_usuario", "apellido_usuario"]
                }
            ]
        });

        if (!membresia || membresia.length === 0) {
            return { message: "No hay usuarios registrados en esta red." };
        }

        return membresia;
    } catch (error) {
        console.error("Error al listar membresía:", error);
        throw new Error(`Error al listar membresía: ${error.message}`);
    }
};