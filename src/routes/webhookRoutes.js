import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import crypto from 'crypto'; 
const router = express.Router();


const verifyMercadoPagoSignature = (rawBody, signatureHeader) => {
  // 1. Validación básica
  if (!rawBody || !signatureHeader) {
    console.error('❌ Faltan parámetros requeridos');
    return false;
  }

  // 2. Extraer componentes de la firma
  const signatureParts = signatureHeader.split(',');
  if (signatureParts.length !== 2) {
    console.error('❌ Formato de firma inválido');
    return false;
  }

  const timestamp = signatureParts[0]?.split('=')[1]?.trim();
  const receivedSignature = signatureParts[1]?.split('=')[1]?.trim();

  // 3. Validar componentes
  if (!timestamp || !receivedSignature) {
    console.error('❌ Faltan timestamp o firma en header');
    return false;
  }

  // 4. Obtener secret (con validación)
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length !== 64) {
    console.error('❌ Secret inválido o no configurado');
    return false;
  }

  // 5. Preparar datos para firma (EXACTAMENTE como lo hace MP)
  const dataToSign = `${timestamp}.${rawBody}`;

  // 6. Calcular firma (con encoding explícito)
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign, 'utf8')
    .digest('hex');

  // 7. Debug detallado (eliminar después de resolver)
  console.log('=== DEBUG FINAL ===');
  console.log('Secret (10 primeros chars):', secret.substring(0, 10) + '...');
  console.log('Timestamp:', timestamp);
  console.log('Datos firmados (50 chars):', dataToSign.substring(0, 50) + '...');
  console.log('Firma recibida:', receivedSignature);
  console.log('Firma generada:', generatedSignature);
  console.log('===================');

  // 8. Comparación segura
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'hex'),
    Buffer.from(generatedSignature, 'hex')
  );
};
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const rawBody = req.body.toString('utf8');
      const signature = req.headers['x-signature'];
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      
      if (!verifyMercadoPagoSignature(rawBody, signature, secret)) {
        return res.status(403).json({ error: 'Firma inválida' });
      }
      
      // Procesar webhook válido...
      res.status(200).end();
      
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).end();
    }
  },
  handleWebhook
);


export default router;
