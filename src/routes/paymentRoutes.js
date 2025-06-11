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
const rawBodyMiddleware = express.raw({
  type: '*/*', // Acepta cualquier tipo de contenido
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length > 0) {
      req.rawBody = buf;
      console.log(`📦 Middleware - RawBody recibido (${buf.length} bytes)`);
      
      // Intenta parsear JSON solo si el contenido es JSON
      if (req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(buf.toString(encoding || 'utf8'));
          console.log('🔄 Body parseado correctamente');
        } catch (e) {
          console.warn('⚠️ Error parseando JSON:', e.message);
          req.body = {};
        }
      }
    } else {
      console.warn('⚠️ Middleware - Buffer vacío o no definido');
      req.rawBody = Buffer.alloc(0);
      req.body = {};
    }
  }
});

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);
// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', rawBodyMiddleware, handleWebhook);
// paymentRoutes.js
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);
export default router;