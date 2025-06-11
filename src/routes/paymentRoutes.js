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

// Versión mejorada del middleware para raw body
const rawBodyMiddleware = (req, res, next) => {
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      req.rawBody = Buffer.concat(chunks);

      if (req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(req.rawBody.toString('utf8'));
        } catch (err) {
          console.warn('⚠️ JSON inválido en body:', err.message);
          req.body = {};
        }
      }

      console.log(`📦 RawBody recibido (${req.rawBody.length} bytes)`);
      next();
    } catch (err) {
      console.error('❌ Error procesando raw body:', err);
      res.status(500).send('Error interno procesando raw body');
    }
  });

  req.on('error', (err) => {
    console.error('❌ Error en stream del request:', err);
    res.status(500).send('Error en el stream de datos');
  });
};


// Middleware de diagnóstico para verificar el flujo
const debugMiddleware = (req, res, next) => {
  console.log('🔍 Headers recibidos:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'x-signature': req.headers['x-signature']
  });
  next();
};

// Rutas de pagos protegidas
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);

// Ruta de webhook con diagnóstico y manejo especial
router.post(
  '/webhook',
  debugMiddleware,  // Middleware de diagnóstico
  rawBodyMiddleware,  // Middleware para raw body
  (req, res, next) => {
    Verificación adicional del body
    if (!req.rawBody || req.rawBody.length === 0) {
      console.error('❌ Error crítico: rawBody no está disponible');
      return res.status(400).json({ error: 'Missing request body' });
    }
    next();
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