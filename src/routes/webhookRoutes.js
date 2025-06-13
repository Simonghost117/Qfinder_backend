import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

app.post('/webhook', 
  console.log('Headers:', req.headers),
console.log('Raw Body:', req.rawBody.toString()),
  express.raw({ type: 'application/json' }), // Recibir como Buffer
  (req, res, next) => {
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