import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

// Middleware para procesar el body como raw buffer
const rawBodyMiddleware = express.raw({ 
  type: 'application/json',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf; // Preserva el buffer original
    req.rawBodyString = buf.toString(encoding || 'utf8');
  }
});

// Middleware de validación mejorado
const validationMiddleware = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  
  try {
    // Verificar que tenemos el body raw
    if (!req.rawBody || !req.rawBodyString) {
      console.error(`❌ [${requestId}] Body no disponible`);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Verificar firma
    const signature = req.headers['x-signature'];
    if (!signature) {
      console.error(`❌ [${requestId}] Firma faltante`);
      return res.status(403).json({ error: 'Signature header missing' });
    }

    // Verificación segura
    const isValid = verifyWebhookSignature(req.rawBody, signature);
    if (!isValid) {
      console.error(`❌ [${requestId}] Firma inválida`);
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Parsear el body a JSON de manera segura
    try {
      req.body = JSON.parse(req.rawBodyString);
      next();
    } catch (parseError) {
      console.error(`❌ [${requestId}] Error parseando JSON:`, parseError);
      return res.status(400).json({ error: 'Invalid JSON format' });
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error en middleware:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/', 
  rawBodyMiddleware,
  validationMiddleware,
  handleWebhook
);

export default router;