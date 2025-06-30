import express from 'express';
import crypto from 'crypto';

const router = express.Router();

router.post('/', 
  // Middleware para parsear el body crudo ya se hizo en app.js
  
  // Middleware para validar firma y procesar webhook
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // Debug: Mostrar datos recibidos
      console.log(`📦 [${requestId}] Headers recibidos:`, req.headers);
      
      // Verificar firma si está configurado el secret
      if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        const signature = req.headers['x-signature'];
        
        if (!signature) {
          console.error(`❌ [${requestId}] Faltan headers de firma`);
          return res.status(403).json({ 
            error: 'Missing signature header',
            requestId
          });
        }

        const isValid = verifyWebhookSignature(req.rawBody, signature);
        
        console.log(`🔍 [${requestId}] Resultado verificación:`, {
          isValid,
          signature,
          secretConfigured: !!process.env.MERCADOPAGO_WEBHOOK_SECRET
        });
        
        if (!isValid) {
          console.error(`❌ [${requestId}] Firma inválida`);
          return res.status(403).json({ 
            error: 'Invalid signature',
            requestId
          });
        }
      }

      // Parsear JSON y asignar al body
      req.body = JSON.parse(req.rawBody.toString('utf8'));
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error en webhook:`, error.message);
      return res.status(400).json({ 
        error: 'Invalid request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId
      });
    }
  },
  
  // Controlador principal
  handleWebhook
);

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error('❌ Webhook secret no configurado');
    return false;
  }

  if (!signatureHeader) {
    console.error('❌ Falta el header x-signature');
    return false;
  }

  try {
    // Parsear el header de firma (formato: "ts=123456789,v1=abcdef123456")
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart.split('=')[1];
    const receivedSig = v1Part.split('=')[1];

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma incorrecto');
      return false;
    }

    // Convertir timestamp de string a número
    const timestampNum = parseInt(timestamp, 10);
    
    // Crear el payload exacto para verificación (timestamp en segundos + . + body)
    const payload = `${Math.floor(timestampNum / 1000)}.${rawBody.toString('utf8')}`;
    
    // Calcular la firma esperada
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');

    // Comparación segura
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    console.log('🔍 Resultado verificación:', {
      timestamp,
      receivedSig,
      expectedSig,
      isValid,
      payloadPreview: payload.substring(0, 50) + (payload.length > 50 ? '...' : '')
    });

    return isValid;
  } catch (error) {
    console.error('❌ Error al verificar firma:', error);
    return false;
  }
}

export default router;