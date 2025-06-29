import express from 'express';
import crypto from 'crypto';
import { handleWebhook } from '../controllers/paymentController.js';

// Importación compatible con ESM para Bull
import bull from 'bull';
const { Queue } = bull;

const router = express.Router();

// Configuración de cola de procesamiento (opcional)
const webhookQueue = new Queue('mercado_pago_webhooks', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
  }
});

// Middleware para capturar el body exacto como Buffer
router.use(express.raw({
  type: 'application/json',
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf; // Almacenamos el buffer exacto
  }
}));

/**
 * Valida la firma del webhook
 */
const verifySignature = (rawBody, signatureHeader) => {
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error('Webhook secret no configurado');
    return false;
  }

  if (!signatureHeader) {
    console.error('Falta header de firma');
    return false;
  }

  try {
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1]?.trim();
    const receivedSig = v1Part?.split('=')[1]?.trim();

    if (!timestamp || !receivedSig) {
      console.error('Formato de firma inválido');
      return false;
    }

    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (error) {
    console.error('Error verificando firma:', error);
    return false;
  }
};

/**
 * Procesamiento asíncrono del webhook
 */
const processWebhookAsync = async (rawBody, headers, requestId) => {
  try {
    console.log(`⌛ [${requestId}] Iniciando procesamiento...`);
    
    // 1. Validar firma
    if (!verifySignature(rawBody, headers['x-signature'])) {
      throw new Error('Firma inválida');
    }

    // 2. Parsear el body
    const data = JSON.parse(rawBody.toString('utf8'));
    
    // 3. Registrar el webhook
    console.log(`📝 [${requestId}] Webhook recibido:`, {
      type: data.type || data.action,
      id: data.id || data.data?.id,
      date: data.date_created
    });

    // 4. Manejar el evento según su tipo
    await handleWebhook(data, requestId);

    console.log(`✅ [${requestId}] Procesamiento completado`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error en procesamiento:`, error.message);
    throw error; // Propaga el error para manejo en la cola
  }
};

/**
 * Endpoint principal de webhook
 */
router.post('/', async (req, res) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  
  try {
    // 1. Responder inmediatamente a MercadoPago
    res.status(200).json({ 
      status: 'received',
      requestId
    });

    // 2. Procesamiento en cola
    await webhookQueue.add({
      rawBody: req.rawBody.toString('base64'),
      headers: req.headers,
      requestId
    }, {
      jobId: requestId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    console.log(`📥 [${requestId}] Webhook encolado para procesamiento`);

  } catch (error) {
    console.error(`⚠️ [${requestId}] Error inicial:`, error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      requestId
    });
  }
});

// Configuración del worker de la cola
webhookQueue.process(async (job) => {
  const { rawBody, headers, requestId } = job.data;
  try {
    const buffer = Buffer.from(rawBody, 'base64');
    await processWebhookAsync(buffer, headers, requestId);
  } catch (error) {
    console.error(`🔄 [${requestId}] Reintentando trabajo fallido`);
    throw error; // Para reintentos automáticos
  }
});

export default router;