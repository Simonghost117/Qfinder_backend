import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth, messaging } from '../config/firebase-admin.js';

const router = express.Router();
router.post('/token/:id_red', verifyToken, async (req, res) => {
  try {
    const { id_red } = req.params;
    const { id_usuario } = req.user;

    // Validar parámetros
    if (!id_red || !id_usuario) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    // Generar token seguro
    const firebaseUid = `ext_${id_usuario}`;
    const token = await auth.createCustomToken(firebaseUid, {
      id_red: parseInt(id_red),
      id_usuario: parseInt(id_usuario),
      backendAuth: true
    });

    // Validar token antes de enviar
    if (!token || token.length < 100) {
      throw new Error('Token generado inválido');
    }

    // DEBUG: Solo registrar longitud (NUNCA el token completo)
    console.log(`Token generado (longitud: ${token.length})`);
    
    res.json({ 
      success: true, 
      firebaseToken: token 
    });
  } catch (error) {
    console.error('Error generando token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar token: ' + error.message 
    });
  }
});

export default router;