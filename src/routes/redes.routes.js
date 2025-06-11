import express from 'express';
import {
    crearRed,
    listarRedes,
    listarRedId,
    actualizarRed,
    eliminarRed,
    redNombre,
    obtenerIdRedPorNombre
 } from '../controllers/redes.controller.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { redesSchema } from '../schema/redesSchema.js';
import { esAdministradorRed } from '../middlewares/validacionesRed.js';
import { validateAdmin, validateRol } from '../middlewares/validateAdmin.js';
import { 
    // requirePlusOrPro, 
    verifyAccess } from '../middlewares/permissionsSuscription.js';

const router = express.Router();
// En redes.routes.js
//🟢
router.get('/obtenerIdRed', verifyToken, obtenerIdRedPorNombre)
//🔴
router.post('/crearMovil',
    verifyToken,
    // requirePlusOrPro(),
    verifyAccess({ 
    allowedRoles: ['Usuario', 'Administrador'],
    blockFree: true // Esto activará el bloqueo para Free
  }), 
    validateSchema(redesSchema),
    crearRed
)
//🟢
router.get('/listarRedes',
    verifyToken,
    listarRedes
)
router.get('/listarRed/:id_red',
    verifyToken,
    listarRedId
)
router.put('/actualizarRed/:id_red',
    verifyToken,
    esAdministradorRed,
    validateSchema(redesSchema),
    actualizarRed
)
router.delete('/eliminarRed/:id_red',
    verifyToken,
    esAdministradorRed,
    eliminarRed
)

router.get('/redNombre',
    verifyToken,
    redNombre
)

//ADMINISTRADOR
router.get('/listarRedesW',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    listarRedes
)
router.post('/crear',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(redesSchema),
    crearRed
)
router.put('/actualizarRedW/:id_red',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(redesSchema),
    actualizarRed
)
router.delete('/eliminarRedW/:id_red',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    eliminarRed
)
export default router;
