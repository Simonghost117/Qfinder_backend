import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Esto hace que req.body sea un Buffer
  (req, res, next) => {
    try {
      // Guarda el buffer tal cual, para usarlo en la verificación
      req.rawBody = req.body;

      // Intenta parsear el JSON para dejarlo en req.body
      req.body = JSON.parse(req.rawBody.toString('utf8'));

      next();
    } catch (err) {
      console.error('❌ Error parseando rawBody:', err.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);

export default router;
