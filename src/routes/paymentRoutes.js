import express from 'express';
import {
<<<<<<< HEAD
  createUserSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  // createSubscriptionPlan,
  webhookHandler
=======
  createCheckoutProPreference,
  handleWebhook
>>>>>>> origin/test1
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

<<<<<<< HEAD
// Admin: Crear planes
router.post('/plans', verifyToken);
=======
// Ruta para crear preferencia de Checkout Pro
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
>>>>>>> origin/test1

// Webhook Mercado Pago (sin autenticación)
router.post('/webhook', express.json(), handleWebhook);

export default router;