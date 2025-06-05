import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth } from '../config/firebase-admin.js'; // Removí messaging si no se usa

const router = express.Router();

router.post('/token/:id_red', verifyToken, async (req, res) => {
  // Inicializar campo token incluso en errores
  const errorResponse = {
    success: false,
    firebaseToken: "",
    message: ""
  };

  try {
    const { id_usuario } = req.user;
    const idRedParam = req.params.id_red;

    // Validar parámetros
    if (!idRedParam || !id_usuario) {
      errorResponse.message = 'Parámetros inválidos';
      return res.status(400).json(errorResponse);
    }

    // Convertir y validar ID de red
    const idRedNum = parseInt(idRedParam);
    if (isNaN(idRedNum)) {
      errorResponse.message = 'id_red debe ser un número válido';
      return res.status(400).json(errorResponse);
    }

    // Generar token
    const firebaseUid = `ext_${id_usuario}`;
    const token = await auth.createCustomToken(firebaseUid, {
      id_red: idRedNum,
      id_usuario: parseInt(id_usuario),
      backendAuth: true
    });

    // Validar token
    if (!token || typeof token !== "string" || token.split('.').length !== 3) {
      throw new Error('Token generado inválido');
    }

    console.log(`[TOKEN] Red:${idRedNum}, User:${id_usuario}, Longitud:${token.length}`);
    
    return res.json({ 
      success: true, 
      firebaseToken: token 
    });
    
  } catch (error) {
    console.error('Error generando token:', error);
    errorResponse.message = 'Error al generar token: ' + error.message;
    return res.status(500).json(errorResponse);
  }
});

export default router;