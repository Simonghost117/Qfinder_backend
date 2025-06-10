import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser, perfilUser, listarUsuarios, listarAdmin, eliminarUsuario, buscarUserNombre, registerUsuario, 
    actualizarUsuario, actualizarAdmin, eliminarAdmin } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema, cambiarContrasenaSchema, usuarioAdmiAct } from '../schema/usuarioSchema.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { recuperarContrasena, cambiarContrasena, verificarCodigo } from '../controllers/recuperarContrasena.js';
import { validateAdmin, validateRol } from '../middlewares/validateAdmin.js';
import {paginationMiddleware} from '../middlewares/pagination.js';

const router = express.Router();
//🟢
router.post('/register',
    validateSchema(registerSchema),
    register
);
//🟢
router.post('/verify',
     verifyUser
    ); // Nueva ruta
//🟢
router.post('/login',
    validateSchema(loginSchema), 
    login
);
//🟢
router.post('/logout', 
    logout
);
router.get('/listarUsers',
    verifyToken, 
    listarUsers
);
//🟢
router.put('/actualizarUser',
    verifyToken, 
    validateSchema(updateSchema), 
    actualizarUser
);
router.delete('/eliminarUser', 
    verifyToken, 
    eliminarUser
);
//🟢
router.post('/recuperar', 
    recuperarContrasena
);
//🟢
router.post('/verificar-codigo', 
    verificarCodigo
);
//🟢
router.post('/cambiar-password', 
    verifyToken,
    validateSchema(cambiarContrasenaSchema),
    cambiarContrasena
);
//🟢
router.get('/perfil',
    verifyToken,
    perfilUser
)

//ADMINISTRADOR

router.get('/listarUsuarios',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    paginationMiddleware(5),
    listarUsuarios
);
router.get('/listarAdmin',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    listarAdmin
);
//Actualizar usuarios en general por parte del administrador (no puede actualizar a otro administrador)
router.put('/actualizarUsuario/:id_usuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(usuarioAdmiAct),
    actualizarUsuario
);
//Eliminar usuario en general por parte del administrador
router.delete('/eliminarUsuario/:id_usuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    eliminarUsuario
); 
router.get('/buscarUsuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    buscarUserNombre
);
router.post('/registrarUsuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(registerSchema),
    registerUsuario
);
//No va a ser utilizada
router.post('/regisUsuarios',
    verifyTokenWeb,
    validateRol(['Super']),
    validateSchema(registerSchema),
    registerUsuario
);
//Perfil personal del administrador
router.get('/perfilAdmin',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    perfilUser
);
router.put('/actualizarPerfilAdmin',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    validateSchema(usuarioAdmiAct),
    actualizarAdmin
);
router.delete('/eliminarPerfilAdmin',
    verifyTokenWeb,
    validateRol(['Super']),
    eliminarAdmin
);

//listar todos los usuarios
//listar todos los pacientes
//actualizar informacion usuarios/pacientes

export default router;