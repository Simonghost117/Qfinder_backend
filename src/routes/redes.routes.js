import express from 'express';
import { unirRedGlobal, verificarMembresia, listarMiembrosRed } from '../controllers/redes.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();


router.post('/unirse/:id',verifyToken, unirRedGlobal);
router.get('/verificar', verifyToken, verificarMembresia); // Nueva ruta para verificar membresía
router.get('/miembros', verifyToken, listarMiembrosRed); // Nueva ruta para listar miembros de la red


export default router;
