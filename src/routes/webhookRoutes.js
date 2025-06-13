import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
  const signature = req.headers['x-signature'];

  try {
    console.log(`🔵 [${requestId}] Iniciando procesamiento de webhook`);
    console.log(`🔵 [${requestId}] Headers recibidos:`);
    console.log({
      'content-type': req.headers['content-type'],
      'x-signature': signature,
      'x-request-id': requestId
    });

    // 🚨 Asegurarse de que el rawBody sea un buffer crudo
    if (!Buffer.isBuffer(req.body)) {
      console.error(`❌ [${requestId}] Error crítico: el cuerpo no es Buffer. Posible falta de express.raw()`);
      return res.status(500).json({
        success: false,
        error: 'El cuerpo no llegó como Buffer (raw)',
        reference: requestId
      });
    }

    req.rawBody = req.body;

    const rawText = req.rawBody.toString('utf8');
    console.log(`📦 [${requestId}] Body RAW recibido (${req.rawBody.length} bytes):`);
    console.log(rawText);

    // 🔍 Log para copiar y probar firma manual
    console.log(`🧪 [${requestId}] Datos para prueba externa de firma:`);
    console.log(`✏️ rawPayload:`);
    console.log('`' + rawText + '`');
    console.log(`🔐 Firma recibida (v1):`, signature?.split(',')?.find(x => x.startsWith('v1='))?.split('=')[1]);

    // Parsear el JSON desde el rawBody
    try {
      req.body = JSON.parse(rawText);
      console.log(`✅ [${requestId}] JSON parseado correctamente`);
    } catch (parseError) {
      console.error(`🔴 [${requestId}] Error al parsear JSON:`, {
        message: parseError.message,
        bodySample: rawText.substring(0, 200)
      });
      return res.status(400).json({
        success: false,
        error: 'JSON inválido',
        reference: requestId
      });
    }

    // Verificar integridad del cuerpo
    console.log(`🧪 [${requestId}] Verificando integridad del cuerpo...`);
    const reencodedLength = Buffer.from(JSON.stringify(req.body)).length;
    const lengthDiff = Math.abs(req.rawBody.length - reencodedLength);

    if (lengthDiff > 10) {
      console.warn(`🟠 [${requestId}] Posible alteración del cuerpo detectada:`, {
        originalLength: req.rawBody.length,
        reencodedLength,
        difference: lengthDiff
      });
    } else {
      console.log(`🟢 [${requestId}] Integridad del cuerpo verificada (diff: ${lengthDiff} bytes)`);
    }

    // 🔁 Continuar con el controlador principal
    next();
  } catch (err) {
    console.error(`❌ [${requestId}] Error inesperado en middleware:`, {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      rawBodySample: req.rawBody?.toString('utf8')?.substring(0, 200),
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      reference: requestId
    });
  }
}, handleWebhook);

export default router;
