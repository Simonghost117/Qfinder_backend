import UsuarioRed from '../models/Red.js';
import Usuario from '../models/usuario.model.js';

export const unirRedGlobal = async (req, res) => {
  try {
    // El ID viene del middleware de autenticación
    const userId = req.userId; 

    const [relacion, created] = await UsuarioRed.findOrCreate({
      where: { id_usuario: userId },
      defaults: {
        estado: 'activa'
      }
    });

    if (!created) {
      await relacion.update({ estado: 'activa' });
    }

    res.status(200).json({ 
      message: 'Unido a la red global exitosamente',
      data: relacion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verificarMembresia = async (req, res) => {
  try {
    const { id } = req.usuario; // ID del usuario autenticado
    const membresia = await UsuarioRed.findOne({
      where: { id_usuario: id }
    });

    res.json({ 
      esMiembro: !!membresia,
      estado: membresia?.estado || 'no_registrado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const listarMiembrosRed = async (req, res) => {
  try {
    const miembros = await UsuarioRed.findAll({
      where: { 
        nombre_red: 'Red Global de Apoyo QfindeR',
        estado: 'activo'
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        required: true,
        attributes: ['id_usuario', 'nombre_usuario', 'correo_usuario'],
        where: { estado_usuario: 'Activo' }
      }],
      attributes: ['id_relacion', 'estado', 'fecha_union'],
      order: [['fecha_union', 'DESC']]
    });
    console.log('Miembros de la red:', miembros);

    const resultado = miembros.map(miembro => ({
      id_relacion: miembro.id_relacion,
      id_usuario: miembro.usuario.id_usuario,
      nombre: miembro.usuario.nombre_usuario,
      correo: miembro.usuario.correo_usuario,
      estado_membresia: miembro.estado,
      fecha_union: miembro.fecha_union
    }));

    res.json({
      total_miembros: resultado.length,
      miembros: resultado
    });

  } catch (error) {
    console.error('Error al listar miembros:', error);
    res.status(500).json({ 
      error: 'Error al obtener miembros de la red',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// // src/controllers/redes.controller.js
// import  Red  from '../models/Red.js';
// import  UsuarioRed  from '../models/UsuarioRed.js';//No se necesita.

// export const listarPorEnfermedad = async (req, res) => {
//   const { enfermedad } = req.query;

//   try {
//     const redes = await Red.findAll({
//       attributes: ['nombre', 'descripcion', 'enfermedad'],
//       where: { enfermedad },
//     });

//     res.json(redes);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       mensaje: "Error al obtener redes",
//       error,
//     });}
//   }
// //       where: enfermedad ? { enfermedad } : {},
// //     });
// //     res.status(200).json(redes);
// //   } catch (error) {
// //     res.status(500).json({ mensaje: 'Error al obtener redes', error });
// //   }
// // };

// export const unirseARed = async (req, res) => {
//   const redId = req.params.id;
//   const userId = 1; // Simula el mismo usuario con ID 1
//   // const userId = req.user.id;

//   try {
//     const existe = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
//     if (existe) return res.status(400).json({ mensaje: 'Ya eres miembro de esta red' });

//     await UsuarioRed.create({ usuarioId: userId, redId });
//     res.status(201).json({ mensaje: 'Te uniste a la red con éxito' });
//   } catch (error) {
//     res.status(500).json({ mensaje: 'Error al unirse a la red', error });
//   }
// };

// export const salirDeRed = async (req, res) => {
//   const redId = req.params.id;
//   const userId = 1; // Simula un usuario con ID 1
//   // const userId = req.user.id;

//   try {
//     const relacion = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
//     if (!relacion) return res.status(404).json({ mensaje: 'No estás unido a esta red' });

//     await relacion.destroy();
//     res.json({ mensaje: 'Saliste de la red con éxito' });
//   } catch (error) {
//     res.status(500).json({ mensaje: 'Error al salir de la red', error });
//   }
// };

