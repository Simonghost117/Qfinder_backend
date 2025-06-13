import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const rawBody = req.body.toString('utf8');
      const signature = req.headers['x-signature'];
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      
      if (!verifyMercadoPagoSignature(rawBody, signature, secret)) {
        return res.status(403).json({ error: 'Firma inválida' });
      }
      
      // Procesar webhook válido...
      res.status(200).end();
      
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).end();
    }
  },
  handleWebhook
);


export default router;
