import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth, messaging } from '../config/firebase-admin.js';

const router = express.Router();

// Endpoint existente para generar token
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
router.post('/register-fcm', verifyToken, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const { id_usuario, tipo_usuario } = req.user;

        if (!fcmToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'FCM token es requerido' 
            });
        }

        // Actualizar token según el tipo de usuario
        if (tipo_usuario === 'Paciente') {
            await Paciente.update({ fcm_token: fcmToken }, { 
                where: { id_usuario } 
            });
        } else {
            await Usuario.update({ fcm_token: fcmToken }, {
                where: { id_usuario }
            });
        }

        res.json({ 
            success: true,
            message: 'Token FCM registrado correctamente'
        });
    } catch (error) {
        console.error('Error registrando FCM token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar token',
            error: error.message
        });
    }
});