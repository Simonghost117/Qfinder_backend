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
  
  req.on('data', (chunk) => chunks.push(chunk));
  
  req.on('end', () => {
    try {
      if (chunks.length > 0) {
        req.rawBody = Buffer.concat(chunks);
        console.log(`📦 RawBody recibido (${req.rawBody.length} bytes)`);
        
        // Solo parsear como JSON si el content-type es application/json
        if (req.headers['content-type']?.includes('application/json')) {
          try {
            req.body = JSON.parse(req.rawBody.toString('utf8'));
            console.log('🔄 Body parseado correctamente');
          } catch (e) {
            console.warn('⚠️ Error parseando JSON:', e.message);
            req.body = {};
          }
        }
      } else {
        req.rawBody = Buffer.alloc(0);
        req.body = {};
        console.warn('⚠️ Solicitud sin cuerpo recibida');
      }
      next();
    } catch (error) {
      console.error('❌ Error en rawBodyMiddleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error en el stream de datos:', error);
    res.status(500).json({ error: 'Request stream error' });
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
    // Verificación adicional del body
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

export default router;