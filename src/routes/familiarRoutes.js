import express from 'express';
import { register, listarFamiliares } from '../controllers/familiarController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import FamiliarSchema from '../schema/familiarSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { validateAdmin } from '../middlewares/validateAdmin.js';

const router = express.Router();
//⭕Establecer relacion con otros datos
router.post('/register', 
    validateSchema(FamiliarSchema), 
    register
);
router.get('/listarFam', 
    verifyToken,
    validateAdmin,
    listarFamiliares
);
//Listar por id

export default router;