import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

router.post('/', 
  // Middleware para procesar el body como raw buffer
  express.raw({ type: 'application/json' }),
  
  // Middleware para manejar el body y la verificación
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

      // Verificar que el body es un Buffer
      if (!Buffer.isBuffer(req.body)) {
        console.error(`❌ [${requestId}] Error: req.body no es Buffer`);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid content type', 
          reference: requestId 
        });
      }

      // Guardar el body original como Buffer y como string
      req.rawBody = req.body;
      const rawBodyString = req.body.toString('utf8');
      
      console.log(`📦 [${requestId}] Body RAW recibido:`, rawBodyString.substring(0, 200) + (rawBodyString.length > 200 ? '...' : ''));

      // Verificación de firma con el Buffer original
      if (!verifyWebhookSignature(req.rawBody, signature)) {
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
        req.body = JSON.parse(rawBodyString);
        console.log(`✅ [${requestId}] JSON parseado correctamente`);
      } catch (parseError) {
        console.error(`❌ [${requestId}] Error parseando JSON:`, parseError);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid JSON format', 
          reference: requestId 
        });
      }

      next();
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