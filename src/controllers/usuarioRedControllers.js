import { db } from '../config/firebase-admin.js';
import { 
    buscarRed, 
    unirmeRed, 
    listarRedesPorUsuario, 
    listarMembresia 
} from "../services/usuarioRedService.js";
import UsuarioRed from "../models/UsuarioRed.js";
import { where } from "sequelize";
import Usuario from "../models/usuario.model.js";

export const unirseRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        // Validación de datos requeridos
        if (!id_red || !id_usuario) {
            return res.status(400).json({ msg: "Datos requeridos" });
        }

        // Verificar si la red existe
        const red = await buscarRed(id_red);
        if (!red) {
            return res.status(404).json({ ok: false, msg: "Red no encontrada" });
        }
        
        // Validar si el usuario ya está en la red
        const usuarioExistente = await UsuarioRed.findOne({
            where: { id_usuario, id_red }
        });

        if (usuarioExistente) {
            return res.status(400).json({ msg: "El usuario ya está registrado en esta red" });
        }

        // Registrar usuario en la red (SQL)
        const usuarioRed = await unirmeRed(id_usuario, id_red);
        if (!usuarioRed) {
            return res.status(500).json({ msg: "Error al unirse a la red" });
        }

        // Registrar en Firebase Realtime Database
        await db.ref(`comunidades/${id_red}/miembros/${id_usuario}`).set({
            rol: 'miembro',
            fecha_union: Date.now()
        });

        return res.status(200).json({
            ok: true,
            msg: "Te has unido a la red correctamente",
            data: usuarioRed
        });

    } catch (error) {
        console.error("Error en unirseRed:", error.message);
        return res.status(500).json({ msg: "Error interno al unirse a la red" });
    }
};

export const redesPertenecientes = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    
    // Importa el modelo correcto (UsuarioRed en lugar de MembresiaRed)
    const UsuarioRed = require('../models/UsuarioRed'); // Ajusta la ruta según tu estructura
    const Red = require('../models/Red'); // Asegúrate de importar el modelo Red

    // Consulta a la base de datos para obtener las redes del usuario
    const redes = await UsuarioRed.findAll({
      where: { id_usuario },
      include: [{ 
        model: Red, 
        as: 'red', // Asegúrate que este alias coincida con tu asociación
        attributes: ['id_red', 'nombre_red', 'descripcion_red']
      }]
    });

    // Mapear los resultados a un formato adecuado
    const redesResponse = redes.map(membresia => ({
      id_red: membresia.red.id_red,
      nombre_red: membresia.red.nombre_red,
      descripcion_red: membresia.red.descripcion_red
    }));

    res.json({ success: true, data: redesResponse });
  } catch (error) {
    console.error("Error en listarRedPertenece:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
};
// export const redesPertenecientes = async (req, res) => {
//     try {
//         const { id_usuario } = req.user;
//         if (!id_usuario) {
//             return res.status(400).json({ msg: "ID de usuario requerido" });
//         }

//         const redes = await listarRedesPorUsuario(id_usuario);
//         if (!redes || redes.length === 0) {
//             return res.status(404).json({ msg: "No estás unido a ninguna red" });
//         }

//         return res.status(200).json({ ok: true, data: redes });

//     } catch (error) {
//         console.error("Error en listarMembresiaRed:", error);
//         return res.status(500).json({ msg: "Error interno al listar redes" });
//     }
// };

export const listarMembresiaRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        if (!id_red) {
            return res.status(400).json({ error: "Id_red requerida"})
        }
        const red = await buscarRed(id_red);
        if(!red) {
            return res.status(404).json({ error: "Red no encontrada"})
        }
        const membresia = await listarMembresia(id_red);
        if(!membresia || membresia.length === 0){
            return res.status(404).json({ error: "Esta red no tiene usuarios"})
        }
        return res.status(200).json({ 
            success: true,
            message: "Lista de usuarios",
            data: membresia
        })

    } catch (error){
        console.error("Error al listar la membresia", error)
        return res.status(500).json({ error: "Error interno al listar la membresia", error: error.message })
    }
}

export const abandonarRed = async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        if(!id_red || !id_usuario) {
            return res.status(400).json({ error: "Datos requeridos"})
        }
        const red = await buscarRed(id_red);
        if(!red) {
            return res.status(404).json({ error: "Red no encontrada"})
        }
        const usuario = await UsuarioRed.findOne({
            where: { id_usuario }
        })
        if(!usuario) {
            return res.status(404).json({ error: "El usuario no pertence a la red"})
        }
        
        // Eliminar de SQL
        await UsuarioRed.destroy({
            where: { id_usuario, id_red }
        });

        // Eliminar de Firebase
        await db.ref(`comunidades/${id_red}/miembros/${id_usuario}`).remove();

        return res.status(200).json({
            success: true,
            message: "Usuario eliminado de la red"
        })
    } catch (error) {
        console.error('Error al abandonar red');
        return res.status(500).json({ error: "Error interno al abandonar red"})
    }
}

export const asignarAdmin = async (req, res) => {
    try {
        const { id_red, id_miembro } = req.params;

        if (!id_red || !id_miembro) {
            return res.status(400).json({ 
                success: false,
                error: "Se requieren ID de red y ID de miembro" 
            });
        }

        const membresia = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            }
        });

        if (!membresia) {
            return res.status(404).json({ 
                success: false,
                error: "El usuario no es miembro de esta red" 
            });
        }

        // Actualizar el rol en SQL
        const [updated] = await UsuarioRed.update(
            { rol: 'administrador' },
            {
                where: {
                    id_usuario: id_miembro,
                    id_red: id_red
                },
                returning: true // Para PostgreSQL
            }
        );

        if (updated === 0) {
            return res.status(404).json({
                success: false,
                error: "No se pudo actualizar el rol"
            });
        }

        // Actualizar el rol en Firebase
        await db.ref(`comunidades/${id_red}/miembros/${id_miembro}`).update({
            rol: 'administrador'
        });

        // Obtener datos actualizados para la respuesta
        const resultado = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            },
            attributes: ['id_usuario', 'id_red', 'rol', 'fecha_union'],
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ['nombre_usuario', 'apellido_usuario']
                }
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Usuario promovido a administrador correctamente",
            data: resultado
        });

    } catch (error) {
        console.error('Error en asignarAdmin:', error);
        return res.status(500).json({ 
            success: false,
            error: "Error interno del servidor",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const eliminarMiembro = async (req, res) => {
    try {
         const { id_red, id_miembro } = req.params;
         if(!id_red || ! id_miembro) {
            return res.status(400).json({ error: "Datos requeridos"})
         }
         const red = await buscarRed(id_red);
         if(!red) {
            return res.status(404).json({ error: "Red no encontrada"})
         }
         const miembro = await UsuarioRed.findOne({
            where: {
                id_usuario: id_miembro,
                id_red: id_red
            }
         })
         if(!miembro) {
            return res.status(404).json({ error: "El usuario no es miembro de sta red"})
         }
         
         // Eliminar de SQL
         await UsuarioRed.destroy({
             where: {
                 id_usuario: id_miembro,
                 id_red: id_red
             }
         });
         
         // Eliminar de Firebase
         await db.ref(`comunidades/${id_red}/miembros/${id_miembro}`).remove();

        return res.status(200).json({
            success: true,
            message: "Miembro eliminado de la red"
        })

    } catch (error) {
        console.error('Error interno al eliminar miembro', error);
        return res.status(500).json({
            error: "Error interno al eliminar miembro"
        })
    }
}