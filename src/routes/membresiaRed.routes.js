import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { 
    listarMembresiaRed,
    unirseRed
 } from '../controllers/usuarioRedControllers.js';

const router = express.Router();

router.post('/unirseRed/:id_red',
    verifyToken,
    unirseRed
)
router.get('/listarMembresiaRed',
    verifyToken,
    listarMembresiaRed
)

export default router;