import express from 'express';
import { handleWebhook } from '../controllers/paymentController.js';
import crypto from 'crypto'; 
const router = express.Router();


const verifyMercadoPagoSignature = (rawBody, signatureHeader, secret) => {
  // Extrae timestamp y firma del header
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1]?.trim();
  const receivedSignature = v1Part?.split('=')[1]?.trim();

  if (!timestamp || !receivedSignature) {
    console.error('❌ Formato de firma inválido');
    return false;
  }

  // Prepara los datos para firmar
  const dataToSign = `${timestamp}.${rawBody}`;
  
  // Codificación UTF-8 explícita
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataToSign, 'utf8');
  const generatedSignature = hmac.digest('hex');

  // Debug detallado
  console.log('=== COMPARACIÓN DE FIRMAS ===');
  console.log('Secret usado:', secret.length, 'caracteres');
  console.log('Timestamp:', timestamp);
  console.log('Datos firmados:', dataToSign.length, 'bytes');
  console.log('Firma recibida:', receivedSignature);
  console.log('Firma generada:', generatedSignature);
  console.log('Coinciden?:', receivedSignature === generatedSignature);
  
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
