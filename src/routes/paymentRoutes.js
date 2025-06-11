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
        // Almacena el buffer exacto como rawBody
        req.rawBody = Buffer.from(buf); // Crear una nueva copia del buffer
        
        // Intenta parsear el JSON para tener req.body
        try {
          req.body = JSON.parse(buf.toString(encoding || 'utf8'));
        } catch (e) {
          console.warn('⚠️ No se pudo parsear el body JSON', e.message);
          req.body = {}; // Asigna un objeto vacío si falla el parseo
        }
      } else {
        console.warn('⚠️ Buffer vacío o no definido');
        req.rawBody = Buffer.from([]); // Asigna un buffer vacío
        req.body = {};
      }
    } catch (e) {
      console.error('❌ Error configurando rawBody', e);
      req.rawBody = Buffer.from([]);
      req.body = {};
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