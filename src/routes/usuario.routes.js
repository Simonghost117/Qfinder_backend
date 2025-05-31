import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser, perfilUser, listarUsuarios, listarAdmin, eliminarUsuario, buscarUserNombre, registerUsuario, 
    actualizarUsuario, actualizarAdmin, eliminarAdmin } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema, cambiarContrasenaSchema, usuarioAdmiAct } from '../schema/usuarioSchema.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { recuperarContrasena, cambiarContrasena, verificarCodigo } from '../controllers/recuperarContrasena.js';
import { validateAdmin } from '../middlewares/validateAdmin.js';

const router = express.Router();

router.post('/register',
    validateSchema(registerSchema),
    register
);
router.post('/verify',
     verifyUser
    ); // Nueva ruta
router.post('/login',
    validateSchema(loginSchema), 
    login
);
router.post('/logout', 
    logout
);
router.get('/listarUsers',
    verifyToken, 
    listarUsers
);
//🔴
router.put('/actualizarUser',
    verifyToken, 
    validateSchema(updateSchema), 
    actualizarUser
);
router.delete('/eliminarUser', 
    verifyToken, 
    eliminarUser
);
router.post('/recuperar', 
    recuperarContrasena
);
router.post('/verificar-codigo', 
    verificarCodigo
);
router.post('/cambiar-password', 
    verifyToken,
    validateSchema(cambiarContrasenaSchema),
    cambiarContrasena
);
//🔴
router.get('/perfil',
    verifyToken,
    perfilUser
)

//ADMINISTRADOR

router.get('/listarUsuarios',
    verifyTokenWeb,
    validateAdmin,
    listarUsuarios
);
router.get('/listarAdmin',
    verifyTokenWeb,
    validateAdmin,
    listarAdmin
);
//Actualizar usuarios en general por parte del administrador
router.put('/actualizarUsuario/:id_usuario',
    verifyTokenWeb,
    validateAdmin,
    validateSchema(usuarioAdmiAct),
    actualizarUsuario
);
//Eliminar usuario en general por parte del administrador
router.delete('/eliminarUsuario/:id_usuario',
    verifyTokenWeb,
    validateAdmin,
    eliminarUsuario
); 
router.get('/buscarUsuario',
    verifyTokenWeb,
    validateAdmin,
    buscarUserNombre
);
router.post('/registrarUsuario',
    verifyTokenWeb,
    validateAdmin,
    validateSchema(registerSchema),
    registerUsuario
);
//Perfil personal del administrador
router.get('/perfilAdmin',
    verifyTokenWeb,
    validateAdmin,
    perfilUser
);
router.put('/actualizarPerfilAdmin',
    verifyTokenWeb,
    validateAdmin,
    validateSchema(usuarioAdmiAct),
    actualizarAdmin
);
router.delete('/eliminarPerfilAdmin',
    verifyTokenWeb,
    validateAdmin,
    eliminarAdmin
);

//listar todos los usuarios
//listar todos los pacientes
//actualizar informacion usuarios/pacientes

export default router;