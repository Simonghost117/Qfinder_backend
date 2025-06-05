import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { 
    listarMembresiaRed,
    redesPertenecientes,
    unirseRed,
    abandonarRed,
    asignarAdmin, 
    eliminarMiembro,
    verificarMembresia,
    obtenerRedYEstadoUnion
 } from '../controllers/usuarioRedControllers.js';
import { esAdministradorRed } from '../middlewares/validacionesRed.js';

const router = express.Router();
//🟢
router.post('/unirseRed/:id_red',
    verifyToken,
    unirseRed
)
//listar las redes a las que pertenece el usuario
//🟢
router.get('/listarRedPertenece',
    verifyToken,
    redesPertenecientes
)
// En tu archivo de rutas
router.get('/verificarMembresia/:id_red', 
    verifyToken,
    verificarMembresia
);
router.get('/obtenerRedYEstadoUnion', verifyToken, obtenerRedYEstadoUnion);
//listar los usuarios que pertenecen a una red
router.get('/listarMembresia/:id_red',
    verifyToken,
    listarMembresiaRed
)
//abandonar una red
router.delete('/abandonarRed/:id_red',
    verifyToken,
    abandonarRed
)
router.put('/administradoresRed/:id_red/:id_miembro',
    verifyToken,
    esAdministradorRed,
    asignarAdmin
)
router.delete('/eliminarMiembro/:id_red/:id_miembro',
    verifyToken,
    esAdministradorRed,
    eliminarMiembro
)

export default router;