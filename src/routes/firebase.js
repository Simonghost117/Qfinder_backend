import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth } from '../config/firebase-admin.js';

const router = express.Router();

router.post('/token/:id_red', verifyToken, async (req, res) => {
    try {
        const { id_red } = req.params;
        const { id_usuario } = req.user;

        const token = await auth.createCustomToken(`ext_${id_usuario}`, {
            id_red,
            id_usuario,
            backendAuth: true
        });

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error al generar token' 
        });
    }
});

export default router;