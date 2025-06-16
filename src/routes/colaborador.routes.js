import { Router } from 'express';
import { buscarUsuarioPorCorreo, agregarColaborador, listarColaboradoresDeMisPacientes, eliminarColaborador } from '../controllers/colaborador.controller.js';
import { validarAgregarColaborador } from '../schema/colaborador.schema.js';
import validarSchema from '../middlewares/validateColaborador.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { validatePermissions } from '../middlewares/episodioPermissions.middleware.js';


const router = Router();

router.get('/buscar/:correo', verifyToken, buscarUsuarioPorCorreo);

router.post('/agregar', verifyToken, validatePermissions(['responsable']), validarSchema(validarAgregarColaborador), agregarColaborador);

//listar todos los colaboradores de un usuarios

router.get('/mis-pacientes', verifyToken, listarColaboradoresDeMisPacientes);


router.delete('/eliminar', verifyToken, validatePermissions(['responsable']), eliminarColaborador);

export default router;