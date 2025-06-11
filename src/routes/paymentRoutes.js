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
const webhookMiddleware = express.json({
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        // Guardar el buffer original sin conversión
        req.rawBody = buf;
        // También parsear el JSON para tener req.body
        req.body = JSON.parse(buf.toString(encoding || 'utf8'));
      }
    } catch (e) {
      console.error('Error setting rawBody', e);
      throw e; // Propagar el error
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