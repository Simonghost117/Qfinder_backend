import express from 'express';
import { login, logout, register, listarUsers, actualizarUser, eliminarUser } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema, updateSchema } from '../schema/usuarioSchema.js';
import { verifyToken } from '../middlewares/validatoreToken.js';

const router = express.Router();

router.post('/register',validateSchema(registerSchema), register);
router.post('/login',validateSchema(loginSchema), login);
router.post('/logout', logout);

router.get('/listarUsers', listarUsers);
router.put('/actualizarUser',validateSchema(updateSchema), verifyToken, actualizarUser);
router.delete('/eliminarUser', verifyToken, eliminarUser);


export default router;