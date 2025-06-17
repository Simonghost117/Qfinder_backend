import express from 'express';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { validateRol } from '../middlewares/validateAdmin.js';
import { estadisticas } from '../controllers/estadisticas.controller.js';

const router = express.Router();

router.get('/',
    verifyTokenWeb,
    validateRol(['Super', 'Administrador']),
    estadisticas
)
export default router;
