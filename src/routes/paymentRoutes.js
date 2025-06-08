import express from 'express';
import {
//  createSubscriptionPlan,
  createUserSubscription,
  getSubscriptionStatus,

} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Admin: Crear planes
 router.post('/plans', verifyToken, createSubscriptionPlan);

// Cliente: Manejo de suscripciones
router.post('/subscriptions', verifyToken, createUserSubscription);
router.get('/subscriptions/:userId', verifyToken, getSubscriptionStatus);

// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);

// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', express.json(), handleWebhook);

export default router;