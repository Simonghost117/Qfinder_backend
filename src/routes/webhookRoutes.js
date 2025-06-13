import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Middleware para raw body
  (req, res, next) => {
    try {
      // Guardar el cuerpo original como Buffer
      req.rawBody = req.body;
      
      // Parsear el JSON para uso posterior
      try {
        req.body = JSON.parse(req.rawBody.toString('utf8'));
        next();
      } catch (parseError) {
        console.error('Error parsing JSON body:', parseError);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    } catch (err) {
      console.error('Error in webhook middleware:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  handleWebhook
);
export default router;
