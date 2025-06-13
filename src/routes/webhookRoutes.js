import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// ✅ Middleware RAW aplicado al router entero antes de cualquier ruta
router.use(express.raw({ type: 'application/json' }));

router.post('/', async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;

  try {
    console.log(`🔵 [${requestId}] Iniciando procesamiento de webhook`);
    console.log(`🔵 [${requestId}] Headers recibidos:`, {
      'content-type': req.headers['content-type'],
      'x-signature': req.headers['x-signature'],
      'x-request-id': requestId
    });

    // Guardar el cuerpo original como Buffer
    req.rawBody = req.body;
    console.log(
      `🔵 [${requestId}] Cuerpo RAW recibido (${req.rawBody?.length} bytes):`,
      req.rawBody?.toString('utf8')?.substring(0, 100) + (req.rawBody?.length > 100 ? '...' : '')
    );

    // Parsear el JSON solo si hay contenido
    if (req.rawBody && req.rawBody.length > 0) {
      try {
        req.body = JSON.parse(req.rawBody.toString('utf8'));
        console.log(`🔵 [${requestId}] Cuerpo parseado correctamente`);
      } catch (parseError) {
        console.error(`🔴 [${requestId}] Error al parsear JSON:`, {
          error: parseError.message,
          bodySample: req.rawBody.toString('utf8').substring(0, 200)
        });
        return res.status(400).json({
          success: false,
          error: 'Cuerpo JSON inválido',
          reference: requestId
        });
      }
    } else {
      console.warn(`🟠 [${requestId}] Cuerpo vacío recibido`);
      req.body = {};
    }

    // Debug: Verificar integridad del cuerpo
    console.log(`🔵 [${requestId}] Verificando integridad del cuerpo...`);
    const originalLength = req.rawBody?.length || 0;
    const reencodedLength = Buffer.from(JSON.stringify(req.body)).length;
    const lengthDiff = Math.abs(originalLength - reencodedLength);

    if (lengthDiff > 10) {
      console.warn(`🟠 [${requestId}] Posible alteración del cuerpo:`, {
        originalLength,
        reencodedLength,
        difference: lengthDiff
      });
    } else {
      console.log(`🟢 [${requestId}] Integridad del cuerpo verificada (diff: ${lengthDiff} bytes)`);
    }

    // Pasar el control al siguiente middleware
    next();
  } catch (err) {
    console.error(`🔴 [${requestId}] Error inesperado en middleware:`, {
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
      error: 'Error interno procesando webhook',
      reference: requestId
    });
  }
}, handleWebhook);

export default router;
