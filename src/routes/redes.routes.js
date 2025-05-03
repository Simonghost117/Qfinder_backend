import express from 'express';
import { unirRedGlobal } from '../controllers/redes.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();


router.post('/unirse/:id',verifyToken, unirRedGlobal);


export default router;
