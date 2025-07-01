import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Middleware para verificación de webhook
const verifyMercadoPagoWebhook = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  console.log(`📦 [${requestId}] Incoming webhook`);
  
  try {
    // 1. Validar que tenemos el cuerpo crudo
    if (!req.rawBody) {
      console.error(`❌ [${requestId}] Missing raw body`);
      return res.status(400).json({ error: 'Missing raw body' });
    }

    // 2. Convertir a string exactamente como vino
    const rawBodyString = req.rawBody.toString('utf8');
    console.log(`ℹ️ [${requestId}] Raw body (first 100 chars):`, rawBodyString.substring(0, 100));

    // 3. Verificar firma si el secret está configurado
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const signature = req.headers['x-signature'] || req.headers['x-signature-sha256'];
      if (!signature) {
        console.error(`❌ [${requestId}] Missing signature header`);
        return res.status(403).json({ error: 'Missing signature header' });
      }

      // 4. Extraer componentes de la firma
      const sigParts = signature.split(',');
      const receivedSig = sigParts.find(p => p.startsWith('v1='))?.split('=')[1];
      const timestamp = sigParts.find(p => p.startsWith('ts='))?.split('=')[1];

      if (!receivedSig || !timestamp) {
        console.error(`❌ [${requestId}] Invalid signature format`);
        return res.status(403).json({ error: 'Invalid signature format' });
      }

      // 5. Reconstruir el payload exacto
      const payload = `${timestamp}.${rawBodyString}`;
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();

      // 6. Calcular la firma esperada
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // 7. Debug detallado (eliminar en producción)
      console.log(`🔍 [${requestId}] Verification debug`, {
        timestamp,
        payloadSample: payload.substring(0, 60) + '...',
        receivedSig,
        expectedSig,
        secret: secret ? '***' + secret.slice(-4) : 'undefined',
        match: receivedSig === expectedSig
      });

      // 8. Comparación segura
      if (receivedSig !== expectedSig) {
        console.error(`❌ [${requestId}] Signature mismatch`);
        return res.status(403).json({ 
          error: 'Invalid signature',
          debug: process.env.NODE_ENV === 'development' ? {
            receivedSig,
            expectedSig,
            payloadSample: payload.substring(0, 60) + '...'
          } : undefined
        });
      }

      console.log(`✅ [${requestId}] Signature verified`);
    }

    // 9. Parsear el JSON solo después de verificar
    try {
      req.body = JSON.parse(rawBodyString);
      req.webhookMetadata = { requestId };
      next();
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON parse error:`, parseError);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Webhook processing error:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Configuración de la ruta
router.post('/', 
  express.raw({ type: 'application/json' }), // Asegura el raw body
  verifyMercadoPagoWebhook,
  handleWebhook
);

export default router;