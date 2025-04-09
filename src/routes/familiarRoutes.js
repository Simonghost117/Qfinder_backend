import express from 'express';
import { register } from '../controllers/familiarController.js';
import validateSchema from "../middlewares/validatoreSchema.js"
import FamiliarSchema from '../schema/familiarSchema.js';

const router = express.Router();

router.post('/register', validateSchema(FamiliarSchema), register);

export default router;