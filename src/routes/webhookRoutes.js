import express from 'express';
import bodyParser from 'body-parser';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

// Middleware para capturar el body RAW antes de cualquier procesamiento
router.use(bodyParser.raw({
  type: 'application/json',
  limit: '10mb'
}));

router.post('/', 
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // Usar el body RAW directamente (como Buffer)
      const rawBody = req.body;
      const rawBodyString = rawBody.toString('utf8');
      
      console.log(`📦 [${requestId}] Body recibido (${rawBody.length} bytes):`, 
        rawBodyString.substring(0, 100) + (rawBodyString.length > 100 ? '...' : ''));

      // Verificar firma con el body sin modificar
      const isValid = verifyWebhookSignature(rawBody, req.headers['x-signature']);
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Firma inválida`);
        return res.status(403).json({ 
          error: 'Invalid signature',
          requestId
        });
      }

      // Parsear JSON solo después de validar la firma
      req.body = JSON.parse(rawBodyString);
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error en webhook:`, error);
      return res.status(400).json({ 
        error: 'Invalid request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId
      });
    }
  },
  handleWebhook
);

export default router;