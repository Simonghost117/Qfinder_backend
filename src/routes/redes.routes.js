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
import { verifyToken } from '../middlewares/verifyToken.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { redesSchema } from '../schema/redesSchema.js';
import { esAdministradorRed } from '../middlewares/validacionesRed.js';
import { validateAdmin } from '../middlewares/validateAdmin.js';

const router = express.Router();
// En redes.routes.js
router.get('/obtenerIdRed', verifyToken, obtenerIdRedPorNombre)
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
router.post('/crear',
    verifyToken,
    validateAdmin,
    validateSchema(redesSchema),
    crearRed
)
export default router;
