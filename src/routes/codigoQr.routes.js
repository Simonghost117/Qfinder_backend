import express from 'express';
import { actualizarPacienteQR } from '../controllers/codigoQrController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';


const router = express.Router();


router.put('/actualizarQr/:id_paciente', verifyToken, actualizarPacienteQR);

export default router;