import express from 'express';
import {
  createCheckoutProPreference,
  handleWebhook,
  successRedirect,
  failureRedirect,
  pendingRedirect,
  verifyPayment,
  verifyWebhookConfig
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Middleware para webhooks que preserva el body raw
const webhookMiddleware = express.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Guarda el Buffer completo
    try {
      // También parsea el JSON para facilitar el acceso a los datos
      req.body = buf.length ? JSON.parse(buf.toString()) : {};
    } catch (e) {
      req.body = {};
    }
  }
});

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);

// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', webhookMiddleware, handleWebhook);
router.get('/webhook', verifyWebhookConfig);

// Redirecciones
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

export default router;