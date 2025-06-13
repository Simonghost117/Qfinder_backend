import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      // Guarda el cuerpo crudo como string
      req.rawBody = req.body.toString('utf8');

      // Intenta parsear el JSON para uso dentro del controlador
      req.parsedBody = JSON.parse(req.rawBody);
      next();
    } catch (err) {
      console.error('Error parsing rawBody:', err);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);

export default router;
