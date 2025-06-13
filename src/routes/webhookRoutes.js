import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Especifica exactamente el tipo esperado
  (req, res, next) => {
    try {
      // Preserva el cuerpo EXACTAMENTE como viene
      req.rawBody = req.body.toString('utf8');
      
      // Intenta parsear para validar que es JSON válido
      req.body = JSON.parse(req.rawBody);
      next();
    } catch (err) {
      console.error('Error parsing JSON:', err);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);


export default router;
