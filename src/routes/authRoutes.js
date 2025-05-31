import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { auth } from '../config/firebase-admin.js';
import UsuarioRed from '../models/UsuarioRed.js';
import Usuario from '../models/usuario.model.js'; // ✅ Asegúrate de que la ruta coincida con la estructura real de tu proyecto

const router = express.Router();

router.post('/firebase-token/:id_red', verifyToken, async (req, res) => {
  try {
    const { id_red } = req.params;
    const { id_usuario } = req.user;

    // Verificar membresía
    const membresia = await UsuarioRed.findOne({
      where: { id_usuario, id_red }
    });

    if (!membresia) {
      return res.status(403).json({ success: false, message: 'No eres miembro de esta red' });
    }

    // Crear token custom de Firebase
    const firebaseToken = await auth.createCustomToken(`ext_${id_usuario}`, {
      id_red,
      id_usuario,
      rol: membresia.rol,
      backendAuth: true
    });

    res.json({ success: true, token: firebaseToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar token', error: error.message });
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
export default router;