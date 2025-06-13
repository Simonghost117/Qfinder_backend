import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      req.rawBody = req.body; // <-- conservar el buffer aquí
      req.body = JSON.parse(req.rawBody.toString('utf8'));
      next();
    } catch (err) {
      console.error('Error parsing JSON:', err);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);



export default router;
