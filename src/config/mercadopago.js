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


// mercadopago.js (versión corregida)
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('Webhook secret not configured');

  const parts = signatureHeader.split(',');
  const receivedSig = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];

  if (!receivedSig || !timestamp) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return receivedSig === expectedSig;
};