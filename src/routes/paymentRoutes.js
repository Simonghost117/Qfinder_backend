import express from 'express';
import {
  createPlan,
  createUserSubscription,
  webhookHandler,
  getSubscriptionStatus,
  cancelSubscription
} from '../controllers/paymentController.js';

const router = express.Router();

// Admin: Crear planes (opcional)
router.post('/plans', createPlan);

// Cliente: Manejo de suscripciones
router.post('/subscriptions', createUserSubscription);
router.get('/subscriptions/:userId', getSubscriptionStatus);
router.post('/subscriptions/cancel', cancelSubscription);

// Webhook Mercado Pago
router.post('/webhook', express.json(), webhookHandler);

export default router;