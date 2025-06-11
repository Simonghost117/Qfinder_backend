import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // raw body solo aquí
  (req, res, next) => {
    try {
      req.rawBody = req.body;
      req.body = JSON.parse(req.rawBody.toString('utf-8'));
      console.log(`📦 RawBody recibido (${req.rawBody.length} bytes)`);
      next();
    } catch (err) {
      console.error('❌ Error al parsear el rawBody:', err);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);

export default router;
