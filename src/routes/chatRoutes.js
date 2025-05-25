import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { 
    enviarMensaje, 
    obtenerMensajes,
    verificarMembresia 
} from '../controllers/chatController.js';
// import { obtenerIdRedPorNombre } from '../controllers/redes.controller.js';
import { esMiembroRed } from '../middlewares/validacionesRed.js';

const router = express.Router();

// Obtener ID de red por nombre
router.get('/obtenerIdRed', verifyToken, );

// Verificar membresía
router.get('/:id_red/verificarMembresia', verifyToken, verificarMembresia);

// Enviar mensaje
router.post('/red/:id_red/enviar', 
    verifyToken,
    esMiembroRed,
    enviarMensaje
);

// Obtener mensajes
router.get('/:id_red/mensajes',
    verifyToken,
    esMiembroRed,
    obtenerMensajes
);

export default router;