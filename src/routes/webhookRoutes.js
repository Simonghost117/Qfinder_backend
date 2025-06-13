import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post(
  '/webhook',
  // Middleware para preservar el cuerpo RAW
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      // Guardar el cuerpo original como Buffer
      req.rawBody = req.body;
      
      // Parsear el JSON solo si hay contenido
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
        error: 'Cuerpo JSON inválido'
      });
    }
  },
  handleWebhook
);

export default router;