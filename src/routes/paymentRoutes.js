import express from 'express';
import {
  createCheckoutProPreference,
  successRedirect,
  failureRedirect,
  pendingRedirect,
  verifyPayment,
  cantSuscripciones
} from '../controllers/paymentController.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import { validateRol } from '../middlewares/validateAdmin.js';

const router = express.Router();


// Rutas de pagos protegidas
router.post('/checkout-pro', verifyToken, createCheckoutProPreference);
router.get('/verify-payment/:paymentId', verifyToken, verifyPayment);
// Rutas de redirección
router.get('/success-redirect', successRedirect);
router.get('/failure-redirect', failureRedirect);
router.get('/pending-redirect', pendingRedirect);

//ADMINISTRADOR
router.get('/cantSusripciones',
  verifyTokenWeb,
  validateRol(['Super', 'Administrador']),
  cantSuscripciones
)

export default router;