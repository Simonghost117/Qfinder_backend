import express from 'express';
import { login, logout, register, 
    listarUsers, actualizarUser, eliminarUser,
    verifyUser } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema } from '../schema/usuarioSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { recuperarContrasena, cambiarContrasena, verificarCodigo } from '../controllers/recuperarContrasena.js';

const router = express.Router();

router.post('/register',validateSchema(registerSchema), register);
router.post('/verify', verifyUser); // Nueva ruta

router.post('/login',validateSchema(loginSchema), login);
router.post('/logout', logout);

router.get('/listarUsers',verifyToken, listarUsers);
router.put('/actualizarUser',verifyToken, validateSchema(updateSchema), checkEpisodioPermissions(['Administrador', 'Usuario']), actualizarUser);
router.delete('/eliminarUser', verifyToken, checkEpisodioPermissions(['Administrador', 'Usuario']), eliminarUser);

router.post('/recuperar', recuperarContrasena);

router.post('/verificar-codigo', verificarCodigo);

router.post('/cambiar-password', verifyToken, cambiarContrasena);

export default router;