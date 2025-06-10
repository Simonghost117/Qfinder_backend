import express from 'express';
import {
  createCheckoutProPreference,
  handleWebhook,
  verifyPayment,
  successRedirect,
  failureRedirect,
  pendingRedirect
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Middleware para capturar rawBody específico para MercadoPago


// Rutas de API
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);

// Webhook Mercado Pago (sin autenticación)
router.post(
  '/webhook',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf; // Captura como Buffer (¡no usar toString!)
    }
  }),
  handleWebhook
);


// Endpoint para verificación manual del webhook
router.get('/webhook', (req, res) => {
  const challenge = req.query.challenge;
  if (!challenge) return res.status(400).send('Missing challenge parameter');
  res.status(200).send(challenge);
});

// Redirecciones
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

export default router;