import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema, cambiarContrasenaSchema } from '../schema/usuarioSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { recuperarContrasena, cambiarContrasena, verificarCodigo } from '../controllers/recuperarContrasena.js';

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

export default router;