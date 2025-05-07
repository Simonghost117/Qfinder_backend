import express from 'express';
import { register, listarFamiliares } from '../controllers/familiarController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import FamiliarSchema from '../schema/familiarSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/register', validateSchema(FamiliarSchema), register);
router.get('/listarFam', 
    verifyToken,
    listarFamiliares
);

export default router;