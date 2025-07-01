import express from 'express';
import crypto from 'crypto';
import { handleWebhook } from '../controllers/paymentController.js';
const router = express.Router();
router.post('/', 
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    console.log(`📦 [${requestId}] Webhook received`);
    
    try {
      // Usa directamente req.rawBody que viene de app.js
      if (!req.rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }

      // Verificación de firma (si aplica)
      if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        const signature = req.headers['x-signature'];
        if (!signature) {
          return res.status(403).json({ error: 'Missing signature' });
        }
        
       
      }

      // Parsear el body una sola vez
      req.body = JSON.parse(req.rawBody.toString('utf8'));
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error:`, error);
      return res.status(400).json({ error: 'Invalid payload' });
    }
  },
  handleWebhook
);
export default router;