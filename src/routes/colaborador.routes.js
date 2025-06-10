import { Router } from 'express';
import { buscarUsuarioPorCorreo, agregarColaborador, eliminarColaborador } from '../controllers/colaborador.controller.js';
import { validarAgregarColaborador } from '../schema/colaborador.schema.js';
import validarSchema from '../middlewares/validateColaborador.js';
import { verifyToken } from '../middlewares/verifyToken.js';


const router = Router();

router.get('/buscar/:correo', verifyToken, buscarUsuarioPorCorreo);

router.post('/agregar', verifyToken, validarSchema(validarAgregarColaborador), agregarColaborador);

router.delete('/eliminar', verifyToken, eliminarColaborador);

export default router;