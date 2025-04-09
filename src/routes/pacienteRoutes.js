import express from 'express';
import { register } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import PacienteSchema from "../schema/pacienteSchema.js";

const router = express.Router();

router.post('/register', validateSchema(PacienteSchema), register);

export default router;