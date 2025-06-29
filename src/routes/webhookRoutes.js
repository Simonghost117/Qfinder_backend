import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

router.post('/', 
  // Middleware para validar firma
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // Debug: Mostrar datos recibidos
      console.log(`📦 Body recibido (${req.rawBody.length} bytes):`, 
        req.rawBodyString.substring(0, 100) + (req.rawBodyString.length > 100 ? '...' : ''));

      // Verificar firma
      const isValid = verifyWebhookSignature(req.rawBody, req.headers['x-signature']);
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Firma inválida`);
        return res.status(403).json({ 
          error: 'Invalid signature',
          requestId
        });
      }

      // Parsear JSON
      req.body = JSON.parse(req.rawBodyString);
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
  
  // Tu controlador principal
  handleWebhook
);
export default router;