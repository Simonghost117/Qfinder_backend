import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

router.post('/', 
  // Middleware para procesar el body como raw buffer
  express.raw({ 
    type: 'application/json',
    verify: (req, res, buf, encoding) => {
      // Guardar el buffer original
      req.rawBody = buf;
      // También guardar como string para logging
      req.rawBodyString = buf.toString(encoding || 'utf8');
    }
  }),
  
  // Middleware de verificación
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    const signature = req.headers['x-signature'];
    
    try {
      console.log(`🔵 [${requestId}] Iniciando procesamiento de webhook`);
      console.log(`🔵 [${requestId}] Headers recibidos:`, {
        'content-type': req.headers['content-type'],
        'x-signature': signature,
        'x-request-id': requestId
      });

      // Verificar que tenemos el body raw
      if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
        console.error(`❌ [${requestId}] Error: req.rawBody no es Buffer`);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid content type', 
          reference: requestId 
        });
      }

      console.log(`📦 [${requestId}] Body RAW recibido (${req.rawBody.length} bytes):`, 
        req.rawBodyString.substring(0, 100) + (req.rawBodyString.length > 100 ? '...' : ''));

      // Verificar que tenemos la firma
      if (!signature) {
        console.error(`❌ [${requestId}] Faltan headers de firma`);
        return res.status(403).json({ 
          success: false, 
          error: 'Missing signature header', 
          reference: requestId 
        });
      }

      // Verificación de firma
      const isValid = verifyWebhookSignature(req.rawBody, signature);
      console.log(`🔍 [${requestId}] Resultado verificación firma:`, isValid);

      if (!isValid) {
        console.error(`❌ [${requestId}] Firma inválida`);
        return res.status(403).json({ 
          success: false, 
          error: 'Invalid signature', 
          reference: requestId 
        });
      }

      console.log(`✅ [${requestId}] Firma válida`);

      // Parsear el body a JSON
      try {
        req.body = JSON.parse(req.rawBodyString);
        next();
      } catch (parseError) {
        console.error(`❌ [${requestId}] Error parseando JSON:`, parseError);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid JSON format', 
          reference: requestId 
        });
      }
    } catch (err) {
      console.error(`❌ [${requestId}] Error en webhook:`, {
        error: err.message,
        stack: err.stack
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error', 
        reference: requestId 
      });
    }
  },
  
  // Controlador final
  handleWebhook
);

export default router;