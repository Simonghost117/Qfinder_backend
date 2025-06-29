import express from 'express';
import bodyParser from 'body-parser';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

router.post('/', 
  // Middleware para parsear el body crudo
  bodyParser.raw({ 
    type: 'application/json',
    limit: '28mb' // Ajusta según tus necesidades
  }),
  
  // Middleware para validar firma y procesar webhook
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // Convertir el Buffer a string para logging
      const rawBodyString = req.body.toString('utf8');
      
      // Debug: Mostrar datos recibidos
      console.log(`📦 [${requestId}] Body recibido (${req.body.length} bytes):`, 
        rawBodyString.substring(0, 100) + (rawBodyString.length > 100 ? '...' : ''));

      // Verificar firma si está configurado el secret
      if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        const signature = req.headers['x-signature'];
        
        if (!signature) {
          console.error(`❌ [${requestId}] Faltan headers de firma`);
          return res.status(403).json({ 
            error: 'Missing signature header',
            requestId
          });
        }

        const isValid = verifyWebhookSignature(req.body, signature);
        
        if (!isValid) {
          console.error(`❌ [${requestId}] Firma inválida`);
          return res.status(403).json({ 
            error: 'Invalid signature',
            requestId
          });
        }
      }

      // Parsear JSON y asignar al body
      req.body = JSON.parse(rawBodyString);
      
      // Agregar rawBodyString al request por si se necesita después
      req.rawBodyString = rawBodyString;
      
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error en webhook:`, {
        error: error.message,
        stack: error.stack,
        headers: req.headers,
        bodyPreview: req.body?.toString('utf8')?.substring(0, 200)
      });
      
      return res.status(400).json({ 
        error: 'Invalid request',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined,
        requestId
      });
    }
  },
  
  // Controlador principal
  handleWebhook
);

export default router;