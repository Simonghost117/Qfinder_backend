import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

// Middleware para capturar el body RAW
router.use(express.raw({
  type: 'application/json',
  limit: '10mb'
}));

router.post('/', 
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // El body ya es un Buffer gracias a express.raw()
      const rawBody = req.body;
      
      // Debug: Mostrar los primeros 100 bytes exactos (sin conversión a string)
      console.log(`📦 [${requestId}] Body recibido (${rawBody.length} bytes):`, 
        rawBody.slice(0, 100).toString('hex'));

      // Verificar firma con el Buffer original
      const isValid = verifyWebhookSignature(rawBody, req.headers['x-signature']);
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Firma inválida`);
        return res.status(403).json({ 
          error: 'Invalid signature',
          requestId
        });
      }

      // Solo ahora parsear el JSON
      req.body = JSON.parse(rawBody.toString('utf8'));
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error en webhook:`, {
        error: error.message,
        headers: req.headers,
        bodyPreview: req.body?.toString('hex')?.substring(0, 200)
      });
      return res.status(400).json({ 
        error: 'Invalid request',
        requestId
      });
    }
  },
  handleWebhook
);

export default router;