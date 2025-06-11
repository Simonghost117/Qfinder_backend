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


// Rutas de pagos protegidas
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);

// Ruta de webhook con diagnóstico y manejo especial
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // ✅ Captura raw body correctamente
  (req, res, next) => {
    // Convertir buffer a string y parsear JSON si es necesario
    try {
      req.rawBody = req.body;
      req.body = JSON.parse(req.rawBody.toString('utf-8'));

      console.log(`📦 RawBody recibido (${req.rawBody.length} bytes)`);

      next();
    } catch (err) {
      console.error('❌ Error al parsear el rawBody:', err);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);

// Rutas de redirección
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

export default router;