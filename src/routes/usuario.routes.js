import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser, perfilUser, listarUsuarios, listarAdmin, eliminarUsuario, buscarUserNombre, registerUsuario } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema, cambiarContrasenaSchema, usuarioAdmiAct } from '../schema/usuarioSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
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
//⭕Establecer que campos se pueden actualizar
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
router.get('/perfil',
    verifyToken,
    perfilUser
)

//ADMINISTRADOR

router.get('/listarUsuarios',
    verifyToken,
    validateAdmin,
    listarUsuarios
);
router.get('/listarAdmin',
    verifyToken,
    validateAdmin,
    listarAdmin
);
router.put('/actualizarUsuario/:id_usuario',
    verifyToken,
    validateAdmin,
    validateSchema(usuarioAdmiAct),
    actualizarUser
);
router.delete('/eliminarUsuario/:id_usuario',
    verifyToken,
    validateAdmin,
    eliminarUsuario
); 
router.get('/buscarUsuario',
    verifyToken,
    validateAdmin,
    buscarUserNombre
);
router.post('/registrarUsuario',
    verifyToken,
    validateAdmin,
    validateSchema(registerSchema),
    registerUsuario
);

//listar todos los usuarios
//listar todos los pacientes
//actualizar informacion usuarios/pacientes

export default router;