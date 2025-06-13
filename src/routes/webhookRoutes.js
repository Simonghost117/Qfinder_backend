import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();


router.post('/webhook', 
  express.raw({ type: 'application/json' }), // Recibir como Buffer
  (req, res, next) => {
      console.log('Headers:', req.headers);
console.log('Raw Body:', req.rawBody.toString());
    req.rawBody = req.body; // Guardar cuerpo original
    try {
      req.body = JSON.parse(req.rawBody.toString()); // Parsear a JSON
      next();
    } catch (err) {
      return res.status(400).send('Invalid JSON');
    }
  },
  handleWebhook
);

export default router;

