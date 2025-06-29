import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import { verifyWebhookSignature } from '../config/mercadopago.js';

const router = express.Router();

// Middleware para capturar el body exacto como Buffer
router.use((req, res, next) => {
  let data = [];
  req.on('data', chunk => {
    data.push(chunk);
  });
  req.on('end', () => {
    req.rawBody = Buffer.concat(data);
    next();
  });
});

router.post('/', 
  async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;
    
    try {
      // Mostrar el body en hexadecimal para depuración
      console.log(`📦 [${requestId}] Body recibido (${req.rawBody.length} bytes):`, 
        req.rawBody.toString('hex').substring(0, 100));

      // Verificar firma con el Buffer exacto recibido
      const isValid = verifyWebhookSignature(
        req.rawBody, 
        req.headers['x-signature']
      );
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Firma inválida`);
        return res.status(403).json({ 
          error: 'Invalid signature',
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            receivedSignature: req.headers['x-signature'],
            bodyHash: crypto.createHash('sha256').update(req.rawBody).digest('hex')
          } : undefined
        });
      }

      // Solo después de validar, parsear el JSON
      req.body = JSON.parse(req.rawBody.toString('utf8'));
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Error en webhook:`, {
        error: error.message,
        headers: req.headers,
        bodyHex: req.rawBody?.toString('hex')?.substring(0, 100)
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