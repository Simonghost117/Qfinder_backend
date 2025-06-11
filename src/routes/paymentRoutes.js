import express from 'express';
import {
  createCheckoutProPreference,
  successRedirect,
  failureRedirect,
  pendingRedirect,
  verifyPayment
} from '../controllers/paymentController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();


// Rutas de pagos protegidas
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);
// Rutas de redirección
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

export default router;