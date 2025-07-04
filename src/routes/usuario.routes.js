import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser, perfilUser, listarUsuarios, listarAdmin, eliminarUsuario, buscarUserNombre, registerUsuario, 
    actualizarUsuario, actualizarAdmin, eliminarAdmin, contarUsuarios, 
    listarUsuariosFiltrados,
    traerMembresia,
    actualizarAdministradores
} from '../controllers/usuarioController.js';
import { resendVerificationCode } from '../services/usuarioService.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema, cambiarContrasenaSchema, usuarioAdmiAct, actualizarAdministradores } from '../schema/usuarioSchema.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { recuperarContrasena, cambiarContrasena, verificarCodigo } from '../controllers/recuperarContrasena.js';
import { validateAdmin, validateRol } from '../middlewares/validateAdmin.js';
import {paginationMiddleware} from '../middlewares/pagination.js';

const router = express.Router();

router.post('/resend-code', resendVerificationCode);


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
router.get('/membresia',
    verifyToken,
    traerMembresia)

//ADMINISTRADOR

router.get('/listarUsuarios',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    paginationMiddleware(10),
    listarUsuarios
);
router.get('/listar',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    listarUsers
)
router.get('/listarAdmin',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    paginationMiddleware(10),
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
router.post('/buscarUsuario',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    paginationMiddleware(10),
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

router.get('/contarUsuarios',
    verifyTokenWeb,
    validateRol(['Administrador', 'Super']),
    contarUsuarios
);

router.get('/filtrar',
  verifyTokenWeb,
  validateRol(['Administrador', 'Super']),
  paginationMiddleware(10),
  listarUsuariosFiltrados
);

router.post('/recuperarW', 
    recuperarContrasena
);
//🟢
router.post('/verificar-codigoW', 
    verificarCodigo
);
//🟢
router.post('/cambiar-passwordW', 
    verifyTokenWeb,
    validateSchema(cambiarContrasenaSchema),
    cambiarContrasena
);
router.put('/actualizarAdministradores/:id_usuario',
    verifyTokenWeb,
    validateRol(['Super']),
    validateSchema(actualizarAdministradores),
    actualizarAdministradores
)
//listar todos los usuarios
//listar todos los pacientes
//actualizar informacion usuarios/pacientes

export default router;