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
const rawBodyMiddleware = (req, res, next) => {
  if (req.is('application/json')) {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        req.rawBody = Buffer.concat(chunks).toString('utf8');
        req.body = JSON.parse(req.rawBody);
        next();
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
    req.on('error', (err) => {
      console.error('Error reading request:', err);
      res.status(500).json({ error: 'Request read error' });
    });
  } else {
    next();
  }
};

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);

// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', rawBodyMiddleware, handleWebhook);
router.get('/webhook', (req, res) => {
  // Endpoint para verificación manual del webhook
  const challenge = req.query.challenge;
  if (!challenge) return res.status(400).send('Missing challenge parameter');
  res.status(200).send(challenge);
});

// Redirecciones
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

export default router;