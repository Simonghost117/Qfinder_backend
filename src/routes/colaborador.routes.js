import { Router } from 'express';
import { buscarUsuarioPorCorreo, agregarColaborador, eliminarColaborador, cantColaboradores } from '../controllers/colaborador.controller.js';
import { validarAgregarColaborador } from '../schema/colaborador.schema.js';
import validarSchema from '../middlewares/validateColaborador.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { validatePermissions } from '../middlewares/episodioPermissions.middleware.js';
import { validateRol } from '../middlewares/validateAdmin.js';


const router = Router();

router.get('/buscar/:correo', verifyToken, buscarUsuarioPorCorreo);

router.post('/agregar', verifyToken, validatePermissions(['responsable']), validarSchema(validarAgregarColaborador), agregarColaborador);

router.delete('/eliminar', verifyToken, eliminarColaborador);

//ADMINISTRADOR

router.get('/cantColaboradores',
    verifyTokenWeb,
    validateRol(['Super', 'Administrador']),
    cantColaboradores
)

export default router;