import express from 'express';
import crypto from 'crypto';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook secret not configured');
    return false;
  }

  // Extraer componentes de la firma
  const parts = signatureHeader.split(',');
  const receivedSig = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];

  if (!receivedSig || !timestamp) {
    console.error('Invalid signature format');
    return false;
  }

  // Crear el payload exactamente como lo hace MercadoPago
  const payload = `${timestamp}.${rawBody}`;

  // Calcular la firma esperada
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  console.log('Verification Debug:', {
    timestamp,
    payloadStart: payload.substring(0, 50),
    receivedSig,
    expectedSig,
    secret: secret ? '***' + secret.slice(-4) : 'undefined'
  });

  return receivedSig === expectedSig;
};

router.post('/', 
  express.raw({ type: 'application/json' }), // Asegurar el raw body
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    console.log(`📦 [${requestId}] Webhook received`);
    
    try {
      // 1. Obtener el cuerpo exacto como lo recibió el servidor
      const rawBody = req.body.toString('utf8');
      
      // 2. Verificación de firma si está configurado
      if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        const signature = req.headers['x-signature'] || req.headers['x-signature-sha256'];
        
        if (!signature) {
          console.error(`❌ [${requestId}] Missing signature header`);
          return res.status(403).json({ 
            success: false,
            error: 'Missing signature header',
            reference: requestId
          });
        }

        if (!verifyWebhookSignature(rawBody, signature)) {
          console.error(`❌ [${requestId}] Invalid signature`);
          return res.status(403).json({ 
            success: false,
            error: 'Invalid webhook signature',
            reference: requestId
          });
        }
      }

      // 3. Parsear el JSON solo ahora
      req.body = JSON.parse(rawBody);
      req.webhookMetadata = { requestId };

      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error:`, error);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid webhook payload',
        details: error.message,
        reference: requestId
      });
    }
  },
  handleWebhook
);

export default router;