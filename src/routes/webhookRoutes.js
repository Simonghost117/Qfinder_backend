import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: '*/*' }), // Acepta cualquier Content-Type
  (req, res, next) => {
    try {
      // Preserva el cuerpo original como string y como objeto parseado
      req.rawBody = req.body.toString('utf8');
      req.body = JSON.parse(req.rawBody); // Esto sobreescribe el Buffer con el objeto parseado
      next();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  },
  handleWebhook
);


export default router;
