import express from 'express';
import { listarMedicos } from '../controllers/medico.controller.js';
import validateSchema from "../middlewares/validatoreSchema.js";
import  { medicoSchema }  from '../schema/medicoSchema.js';

const router = express.Router();

router.get('/listar', listarMedicos);

export default router;