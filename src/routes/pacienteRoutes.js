import express from 'express';
import { register, listarPacientes, getPacienteById, actualizarPaciente, eliminarPaciente } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import {PacienteSchema, ActPacienteSchema} from "../schema/pacienteSchema.js";
import { verifyToken } from '../middlewares/verifyToken.js';
import { verificarRelacion } from '../middlewares/injectPacienteId.middleware.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';

const router = express.Router();

router.post('/register',verifyToken, validateSchema(PacienteSchema), register);
router.get('/listarPacientes', verifyToken, listarPacientes);
router.get('/listarPacientes/:id_paciente', verifyToken, getPacienteById);
//Se puede actualizar la informacion de un paciente
//Validaciones de quien puede modificar la informacion de un paciente
router.put('/actualizarPaciente/:id_paciente', verifyToken, checkEpisodioPermissions(['Familiar', 'Usuario']), validateSchema(ActPacienteSchema), actualizarPaciente);
router.delete('/eliminarPaciente/:id_paciente', verifyToken, verificarRelacion, eliminarPaciente);

export default router;
