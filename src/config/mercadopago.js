import { MercadoPagoConfig } from 'mercadopago';
import crypto from 'crypto';

export const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const isSandbox = process.env.NODE_ENV !== 'production';
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está definido en las variables de entorno');
  }

  return new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
      timeout: 15000,
      idempotencyKey: `mp-${Date.now()}`,
      // integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID,
      sandbox: isSandbox
    }
  });
};

export const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  
  if (!signature || !timestamp || !secret) {
    console.error('Faltan parámetros para validar el webhook');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${payload}`)
    .digest('hex');

  return signature === `v1=${generatedSignature},ts=${timestamp}`;
};