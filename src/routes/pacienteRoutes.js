import express from 'express';
import { register, listarPacientes, getPacienteById, actualizarPaciente, eliminarPaciente, listarTodosPacientes,
    registerPaciente2,
    actualizarPaciente2,
    listarPacientes2,
    obtenerRolPaciente
 } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import {PacienteSchema, ActPacienteSchema, ActPaciente2} from "../schema/pacienteSchema.js";
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions, validatePermissions } from '../middlewares/episodioPermissions.middleware.js';
import { validateAdmin, validateRol } from '../middlewares/validateAdmin.js';
import { paginationMiddleware } from '../middlewares/pagination.js';
const router = express.Router();

//🟢
router.post('/register',
    verifyToken, 
    validateSchema(PacienteSchema), 
    register
);
//🟢
router.get('/listarPacientes', 
    verifyToken, 
    listarPacientes
);
//🟢
router.get('/listarPacientes/:id_paciente',
    verifyToken, 
    checkEpisodioPermissions(['Usuario']),
    getPacienteById
    );
//🟢
router.put('/actualizarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions([ 'Usuario']), 
    validatePermissions(['responsable', ]),
    validateSchema(ActPacienteSchema), 
    actualizarPaciente
);
router.delete('/eliminarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions([ 'Usuario']),
    validatePermissions(['responsable', ]),
    eliminarPaciente
);

//Esta ruta la creo para que valide si es responsable o si es colaborador, BUENO ALISON????
router.get('/pacientes/:id_paciente/rol', 
    verifyToken, 
    obtenerRolPaciente);

//ADMINISTRADOR

router.get('/todosPacientes', 
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    paginationMiddleware(10),
    listarTodosPacientes
)
router.get('/listarPacientes2/:id_usuario',
    verifyTokenWeb, 
    validateRol(['Administrador', 'Super']), 
    // checkEpisodioPermissions(['Administrador']),
    listarPacientes2
);
router.post('/registrarPaciente2/:id_usuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(PacienteSchema),
    registerPaciente2
);
router.put('/actualizarPaciente2/:id_paciente', 
    verifyTokenWeb, 
    validateRol(['Administrador', 'Super']), 
    validateSchema(ActPaciente2), 
    actualizarPaciente2
);
router.delete('/eliminarPaciente2/:id_paciente',
    verifyTokenWeb, 
    validateRol(['Administrador', 'Super']), 
    eliminarPaciente
);

export default router;
