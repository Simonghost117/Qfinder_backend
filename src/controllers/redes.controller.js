// src/controllers/redes.controller.js
import  Red  from '../models/Red.js';
import  UsuarioRed  from '../models/UsuarioRed.js';

export const listarPorEnfermedad = async (req, res) => {
  const { enfermedad } = req.query;

  try {
    const redes = await Red.findAll({
      attributes: ['nombre', 'descripcion', 'enfermedad'],
      where: { enfermedad },
    });

    res.json(redes);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "Error al obtener redes",
      error,
    });}
  }
//       where: enfermedad ? { enfermedad } : {},
//     });
//     res.status(200).json(redes);
//   } catch (error) {
//     res.status(500).json({ mensaje: 'Error al obtener redes', error });
//   }
// };

export const unirseARed = async (req, res) => {
  const redId = req.params.id;
  const userId = 1; // Simula el mismo usuario con ID 1
  // const userId = req.user.id;

  try {
    const existe = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
    if (existe) return res.status(400).json({ mensaje: 'Ya eres miembro de esta red' });

    await UsuarioRed.create({ usuarioId: userId, redId });
    res.status(201).json({ mensaje: 'Te uniste a la red con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al unirse a la red', error });
  }
};

export const salirDeRed = async (req, res) => {
  const redId = req.params.id;
  const userId = 1; // Simula un usuario con ID 1
  // const userId = req.user.id;

  try {
    const relacion = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
    if (!relacion) return res.status(404).json({ mensaje: 'No estás unido a esta red' });

    await relacion.destroy();
    res.json({ mensaje: 'Saliste de la red con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al salir de la red', error });
  }
};
