import express from 'express';
import {
    crearRed,
    listarRedes,
    listarRedId,
    actualizarRed,
    eliminarRed,
    redNombre
 } from '../controllers/redes.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { redesSchema } from '../schema/redesSchema.js';

const router = express.Router();

router.post('/crear',
    verifyToken,
    validateSchema(redesSchema),
    crearRed
)
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
    validateSchema(redesSchema),
    actualizarRed
)
router.delete('/eliminarRed/:id_red',
    verifyToken,
    eliminarRed
)

router.get('/redNombre/:nombre_red',
    verifyToken,
    redNombre
)
export default router;
