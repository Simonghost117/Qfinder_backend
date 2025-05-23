import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { enviarMensaje, obtenerMensajes } from '../controllers/chatController.js';
import { esMiembroRed } from '../middlewares/validacionesRed.js'; // Deberás crear este middleware

const router = express.Router();

// Nuevo endpoint para obtener ID de red por nombre
router.get('/obtenerIdRed', verifyToken, obtenerIdRedPorNombre);

router.post('/:id_red/enviar', 
  verifyToken,
  esMiembroRed,
  enviarMensaje
);

router.get('/:id_red/mensajes',
  verifyToken,
  esMiembroRed,
  obtenerMensajes
);

export default router;