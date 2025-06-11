import express from 'express';
import {
  createCheckoutProPreference,
  handleWebhook,
  successRedirect,
  failureRedirect,
  pendingRedirect,
    verifyPayment
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();
// Middleware para webhooks que preserva el body raw
const webhookMiddleware = express.raw({
  type: 'application/json',
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        req.rawBody = buf; // Almacena el buffer exacto
        
        // Opcional: parsear el JSON para tener req.body
        try {
          req.body = JSON.parse(buf.toString(encoding || 'utf8'));
        } catch (e) {
          console.warn('⚠️ No se pudo parsear el body JSON');
        }
      }
    } catch (e) {
      console.error('❌ Error configurando rawBody', e);
      throw e;
    }
  }
});

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);
// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', webhookMiddleware, handleWebhook);
// paymentRoutes.js
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);
export default router;