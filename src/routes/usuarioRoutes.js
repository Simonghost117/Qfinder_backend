import express from 'express';
import { login, logout, register } from '../controllers/usuarioController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { loginSchema, registerSchema } from '../schema/usuarioSchema.js';

const router = express.Router();

router.post('/register',validateSchema(registerSchema), register);
router.post('/login',validateSchema(loginSchema), login);
router.post('/logout', logout)


export default router;