import express from 'express';
import { getPanelPaciente } from '../controllers/panelController.js';
import verificarRol from '../middlewares/verificarRol.js';

const router = express.Router();

//router.get('/panel/:idPaciente', verificarRol('Medico'), getPanelPaciente);
router.get('/obtenerPanel/:idPaciente', getPanelPaciente);

export default router;
