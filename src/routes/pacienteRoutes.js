import express from 'express';
import { register, listarPacientes, getPacienteById, actualizarPaciente, eliminarPaciente, listarTodosPacientes,
    registerPaciente2,
    actualizarPaciente2
 } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import {PacienteSchema, ActPacienteSchema, ActPaciente2} from "../schema/pacienteSchema.js";
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { validateAdmin } from '../middlewares/validateAdmin.js';
const router = express.Router();

router.post('/register',
    verifyToken, 
    validateSchema(PacienteSchema), 
    register
);
router.get('/listarPacientes', 
    verifyToken, 
    listarPacientes
);
router.get('/listarPacientes/:id_paciente',
    verifyToken, 
    checkEpisodioPermissions(['Usuario']),
    getPacienteById
    );
router.put('/actualizarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions([ 'Usuario']), 
    validateSchema(ActPacienteSchema), 
    actualizarPaciente
);
router.delete('/eliminarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions([ 'Usuario']),
    eliminarPaciente
);

//ADMINISTRADOR

router.get('/todosPacientes', 
    verifyTokenWeb,
    validateAdmin,
    listarTodosPacientes
)
router.get('/listarPacientes2/:id_usuario',
    verifyTokenWeb, 
    validateAdmin, 
    checkEpisodioPermissions(['Administrador']),
    listarPacientes
);
router.post('/registrarPaciente2/:id_usuario',
    verifyTokenWeb,
    validateAdmin,
    validateSchema(PacienteSchema),
    registerPaciente2
);
router.put('/actualizarPaciente2/:id_paciente', 
    verifyTokenWeb, 
    validateAdmin, 
    validateSchema(ActPaciente2), 
    actualizarPaciente2
);
router.delete('/eliminarPaciente2/:id_paciente',
    verifyTokenWeb, 
    validateAdmin, 
    eliminarPaciente
);


export default router;
