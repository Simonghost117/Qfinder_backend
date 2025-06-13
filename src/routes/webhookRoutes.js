import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: '*/*' }), // <--- Acepta cualquier Content-Type (más flexible para pruebas)
  (req, res, next) => {
    try {
      req.rawBody = req.body.toString('utf8');
      req.parsedBody = JSON.parse(req.rawBody);
      next();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);


export default router;
