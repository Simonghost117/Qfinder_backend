import express from 'express';
import { register, listarPacientes, getPacienteById, actualizarPaciente, eliminarPaciente, listarTodosPacientes } from '../controllers/pacienteController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import {PacienteSchema, ActPacienteSchema} from "../schema/pacienteSchema.js";
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

export default router;
