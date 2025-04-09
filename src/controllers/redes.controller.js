
const { Red, UsuarioRed } = require('../models');

exports.listarPorEnfermedad = async (req, res) => {
  const { enfermedad } = req.query;
  try {
    const redes = await Red.findAll({
      where: enfermedad ? { enfermedad } : {},
    });
    res.status(200).json(redes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener redes', error });
  }
};

exports.unirseARed = async (req, res) => {
  const redId = req.params.id;
  const userId = req.user.id;

  try {
    const existe = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
    if (existe) return res.status(400).json({ mensaje: 'Ya eres miembro' });

    await UsuarioRed.create({ usuarioId: userId, redId });
    res.status(201).json({ mensaje: 'Unido con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al unirse', error });
  }
};

exports.salirDeRed = async (req, res) => {
  const redId = req.params.id;
  const userId = req.user.id;

  try {
    const relacion = await UsuarioRed.findOne({ where: { usuarioId: userId, redId } });
    if (!relacion) return res.status(404).json({ mensaje: 'No estás en la red' });

    await relacion.destroy();
    res.json({ mensaje: 'Saliste con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al salir', error });
  }
};
