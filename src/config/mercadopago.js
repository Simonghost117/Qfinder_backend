import { MercadoPagoConfig } from 'mercadopago';
import crypto from 'crypto';

export const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const isSandbox = process.env.NODE_ENV !== 'production';
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está definido en las variables de entorno');
  }

  return new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
      timeout: 15000,
      idempotencyKey: `mp-${Date.now()}`,
      integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID,
      sandbox: isSandbox
    }
  });
};

export const verifyWebhookSignature = (rawBody, receivedSignature) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Webhook secret not configured');
  }

  const payloadBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody);

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBuffer)
    .digest('hex');

  // ✅ Extraer solo el valor de v1
  const parsedSignature = receivedSignature
    .split(',')
    .find(part => part.startsWith('v1='))
    ?.split('=')[1];

  if (!parsedSignature) {
    throw new Error('v1 signature not found in header');
  }

  console.log('🔍 Verificación de firma:');
  console.log('✉️ Cuerpo recibido:', payloadBuffer.toString('utf8'));
  console.log('📨 Firma recibida:', parsedSignature);
  console.log('🛠 Firma generada:', generatedSignature);

  return crypto.timingSafeEqual(
    Buffer.from(parsedSignature, 'hex'),
    Buffer.from(generatedSignature, 'hex')
  );
};

