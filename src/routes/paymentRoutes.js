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

// Ruta de prueba para diagnóstico
router.post('/webhook-test', rawBodyMiddleware, (req, res) => {
  res.json({
    status: 'success',
    rawBodyReceived: !!req.rawBody,
    rawBodyLength: req.rawBody?.length,
    bodyContent: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'x-signature': req.headers['x-signature']
    }
  });
});

router.post('/webhook-debug', rawBodyMiddleware, async (req, res) => {
  const start = Date.now();
  
  // Simular diferentes escenarios
  const simulate = req.query.simulate || 'normal';
  
  if (simulate === 'timeout') {
    // No responder para probar timeout
    return;
  }
  
  if (simulate === 'delay') {
    await new Promise(resolve => setTimeout(resolve, 40000));
  }

  res.json({
    status: 'success',
    processingTime: `${Date.now() - start}ms`,
    rawBodyLength: req.rawBody?.length,
    body: req.body,
    headers: req.headers
  });
});
export default router;