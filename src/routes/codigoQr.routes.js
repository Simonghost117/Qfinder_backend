import express from 'express';
import { actualizarPacienteQR } from '../controllers/codigoQrController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';


const router = express.Router();
//Extraer el qr

router.put('/actualizarQr/:id_paciente', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']), 
    actualizarPacienteQR);

export default router;