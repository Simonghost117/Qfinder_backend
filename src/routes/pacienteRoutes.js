import express from 'express';
import { register, listarPacientes } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import PacienteSchema from "../schema/pacienteSchema.js";
import { verifyToken } from '../middlewares/validatoreToken.js';

const router = express.Router();

router.post('/register',verifyToken, validateSchema(PacienteSchema), register);
router.get('/listarPacientes', verifyToken, listarPacientes);

export default router;