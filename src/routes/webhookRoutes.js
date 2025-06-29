import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

// Middleware para capturar el body crudo
const captureRawBody = (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    req.rawBody = data;
    next();
  });
};

// Middleware de validación
const validateWebhook = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  
  try {
    // Verificación crítica del body
    if (!req.rawBody) {
      console.error(`❌ [${requestId}] Body no disponible - rawBody:`, req.rawBody);
      return res.status(400).json({ error: 'Request body missing' });
    }

    console.log(`📦 [${requestId}] Body recibido:`, req.rawBody.substring(0, 100) + (req.rawBody.length > 100 ? '...' : ''));

    // Verificación de firma
    const signature = req.headers['x-signature'];
    if (!signature) {
      console.error(`❌ [${requestId}] Firma faltante`);
      return res.status(403).json({ error: 'Signature header missing' });
    }

    const isValid = verifyWebhookSignature(Buffer.from(req.rawBody), signature);
    if (!isValid) {
      console.error(`❌ [${requestId}] Firma inválida`);
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Parseo seguro del JSON
    try {
      req.body = JSON.parse(req.rawBody);
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
  captureRawBody, // Captura el body crudo primero
  validateWebhook, // Luego valida
  handleWebhook // Finalmente procesa
);

export default router;