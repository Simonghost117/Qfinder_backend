import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Recibir el cuerpo como Buffer
  (req, res, next) => {
    try {
      // Guardar el cuerpo original como Buffer para verificación de firma
      req.rawBody = req.body;
      
      // Parsear el JSON solo una vez
      if (req.rawBody && req.rawBody.length > 0) {
        req.body = JSON.parse(req.rawBody.toString('utf8'));
      } else {
        req.body = {};
      }
      next();
    } catch (err) {
      console.error('Error al parsear JSON:', {
        error: err.message,
        body: req.rawBody?.toString('utf8')?.substring(0, 100)
      });
      return res.status(400).json({ 
        success: false,
        error: 'Cuerpo JSON inválido',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },
  handleWebhook
);

export default router;