import express from 'express';
import { register, listarPacientes, getPacienteById, actualizarPaciente, eliminarPaciente, listarTodosPacientes,
    registerPaciente2,
    actualizarPaciente2
 } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import {PacienteSchema, ActPacienteSchema, ActPaciente2} from "../schema/pacienteSchema.js";
import { verifyToken } from '../middlewares/verifyToken.js';
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
        checkEpisodioPermissions(['Administrador', 'Usuario']),
     getPacienteById
    );
router.put('/actualizarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions(['Administrador', 'Usuario']), 
    validateSchema(ActPacienteSchema), 
    actualizarPaciente
);
router.delete('/eliminarPaciente/:id_paciente', 
    verifyToken, 
    checkEpisodioPermissions(['Administrador', 'Usuario']),
    eliminarPaciente
);

//ADMINISTRADOR
router.get('/todosPacientes', 
    verifyToken,
    validateAdmin,
    listarTodosPacientes
)
router.post('/registrarPaciente2/:id_usuario',
    verifyToken,
    validateAdmin,
    validateSchema(PacienteSchema),
    registerPaciente2
);
router.put('/actualizarPaciente2/:id_paciente', 
    verifyToken, 
    validateAdmin, 
    validateSchema(ActPaciente2), 
    actualizarPaciente2
);

export default router;
