import { where } from 'sequelize';
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

export const listarRedesPorUsuario = async ( id_usuario, id_red ) => {
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