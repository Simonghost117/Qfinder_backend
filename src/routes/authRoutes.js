import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth } from '../config/firebase-admin.js';
import UsuarioRed from '../models/usuarioRed.model.js';

const router = express.Router();

router.post('/firebase-token/:id_red', verifyToken, async (req, res) => {
  try {
    const { id_red } = req.params;
    const { id_usuario } = req.user;

    // Verificar membresía
    const membresia = await UsuarioRed.findOne({
      where: { id_usuario, id_red }
    });

    if (!membresia) {
      return res.status(403).json({ success: false, message: 'No eres miembro de esta red' });
    }

    // Crear token custom de Firebase
    const firebaseToken = await auth.createCustomToken(`ext_${id_usuario}`, {
      id_red,
      id_usuario,
      rol: membresia.rol,
      backendAuth: true
    });

    res.json({ success: true, token: firebaseToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar token', error: error.message });
  }
});

export default router;