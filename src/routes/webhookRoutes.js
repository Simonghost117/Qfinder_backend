import express from 'express';
import crypto from 'crypto';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/', 
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    console.log(`📦 [${requestId}] Webhook received`);
    
    try {
      // 1. Verificar que tenemos el rawBody
      if (!req.rawBody) {
        console.error(`❌ [${requestId}] Missing raw body`);
        return res.status(400).json({ 
          success: false,
          error: 'Missing raw body',
          reference: requestId
        });
      }

      // 2. Verificación de firma si está configurado el secret
      if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        const signature = req.headers['x-signature'];
        if (!signature) {
          console.error(`❌ [${requestId}] Missing signature header`);
          return res.status(403).json({ 
            success: false,
            error: 'Missing signature header',
            reference: requestId
          });
        }

        // Convertir el rawBody a string si es un Buffer
        const rawBodyString = Buffer.isBuffer(req.rawBody) 
          ? req.rawBody.toString('utf8') 
          : req.rawBody;

        // Verificar la firma
        const isValid = verifyWebhookSignature(rawBodyString, signature);
        
        if (!isValid) {
          console.error(`❌ [${requestId}] Invalid signature`);
          return res.status(403).json({ 
            success: false,
            error: 'Invalid signature',
            reference: requestId
          });
        }
        
        console.log(`🔒 [${requestId}] Signature verified successfully`);
      }

      // 3. Parsear el body solo si es necesario (y asegurarse de que es JSON válido)
      try {
        req.body = typeof req.rawBody === 'object' && !Buffer.isBuffer(req.rawBody) 
          ? req.rawBody 
          : JSON.parse(req.rawBody.toString('utf8'));
      } catch (parseError) {
        console.error(`❌ [${requestId}] Error parsing JSON:`, parseError);
        return res.status(400).json({ 
          success: false,
          error: 'Invalid JSON payload',
          reference: requestId
        });
      }

      // Adjuntar metadata útil para el controlador
      req.webhookMetadata = {
        requestId,
        receivedAt: new Date(),
        rawBody: req.rawBody // Pasamos el rawBody por si acaso
      };

      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Unexpected error:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        reference: requestId
      });
    }
  },
  handleWebhook
);

// Función mejorada de verificación de firma
function verifyWebhookSignature(rawBody, signatureHeader) {
  try {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new Error('MercadoPago webhook secret not configured');
    }

    // Extraer componentes de la firma
    const parts = signatureHeader.split(',');
    const receivedSig = parts.find(p => p.startsWith('v1='))?.split('=')[1];
    const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];

    if (!receivedSig || !timestamp) {
      console.error('Invalid signature format - missing v1 or ts');
      return false;
    }

    // Crear el payload exacto que MercadoPago usó para firmar
    const payload = `${timestamp}.${rawBody}`;

    // Calcular la firma esperada
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Comparación segura contra ataques de timing
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    // Logs para debugging (quitar en producción)
    console.log('ℹ️ Webhook verification details:', {
      payloadSample: payload.substring(0, 50) + '...',
      receivedSig: receivedSig.substring(0, 8) + '...',
      expectedSig: expectedSig.substring(0, 8) + '...',
      isValid
    });

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export default router;