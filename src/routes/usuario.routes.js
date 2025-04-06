import express from 'express';
import { register } from '../controllers/usuario.controller.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import UsuarioSchema from '../schema/usuarioSchema.js';

const router = express.Router();

router.post('/register',validateSchema(UsuarioSchema), register);

export default router;