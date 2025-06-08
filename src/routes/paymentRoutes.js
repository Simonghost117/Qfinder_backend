import express from 'express';
import {
  createCheckoutProPreference,
  handleWebhook
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);

// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', express.json(), handleWebhook);

export default router;