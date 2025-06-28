import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  const signature = req.headers['x-signature'];
    const rawBody = req.rawBody;

      console.log('📨 Body recibido:', rawBody.substring(0, 200) + '...');
  console.log('🔏 Firma recibida:', signature);

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('❌ Firma inválida - Rechazando webhook');
    return res.status(403).json({ error: 'Invalid signature' });
  }
  try {
    console.log(`🔵 [${requestId}] Iniciando procesamiento de webhook`);
    console.log(`🔵 [${requestId}] Headers recibidos:`, {
      'content-type': req.headers['content-type'],
      'x-signature': signature,
      'x-request-id': requestId
    });

    if (!Buffer.isBuffer(req.body)) {
      console.error(`❌ [${requestId}] Error: req.body no es Buffer`);
      return res.status(500).json({ success: false, error: 'Body no es Buffer', reference: requestId });
    }

    req.rawBody = req.body;
    const rawText = req.rawBody.toString('utf8');
    console.log(`📦 [${requestId}] Body RAW recibido:`, rawText);

    // ✅ Verificación de firma ANTES de parsear o mutar el body
    const valid = verifyWebhookSignature(req.rawBody, signature);
    if (!valid) {
      console.error(`❌ [${requestId}] Firma inválida`);
      return res.status(403).json({ success: false, error: 'Firma inválida', reference: requestId });
    }
    console.log(`✅ [${requestId}] Firma válida`);

    // ✅ Ahora sí, parsear body
    req.body = JSON.parse(rawText);
    console.log(`✅ [${requestId}] JSON parseado correctamente`);

    next();
  } catch (err) {
    console.error(`❌ [${requestId}] Error en webhook:`, {
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ success: false, error: 'Error en webhook', reference: requestId });
  }
}, handleWebhook);

export default router;
