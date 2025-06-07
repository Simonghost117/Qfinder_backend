import express from 'express';
import {
  createPlan,
  createUserSubscription,
  webhookHandler,
  getSubscriptionStatus,
  cancelSubscription
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Admin: Crear planes
router.post('/plans', verifyToken, createPlan);

// Cliente: Manejo de suscripciones
router.post('/subscriptions', verifyToken, createUserSubscription);
router.get('/subscriptions/:userId', verifyToken, getSubscriptionStatus);
router.post('/subscriptions/cancel', verifyToken, cancelSubscription);

// Webhook Mercado Pago
router.post('/webhook', express.json(), webhookHandler);

export default router;