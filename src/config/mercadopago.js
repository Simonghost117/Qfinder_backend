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
      integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID,
      sandbox: isSandbox
    }
  });
};

export const verifyWebhookSignature = (body, signatureHeader) => {
  if (!signatureHeader) {
    console.warn('No signature header present');
    return false;
  }

  try {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('MERCADOPAGO_WEBHOOK_SECRET is not set');
      return false;
    }

    const [tsPart, v1Part] = signatureHeader.split(',');
    if (!tsPart || !v1Part) {
      console.warn('Invalid signature format');
      return false;
    }

    const ts = tsPart.split('=')[1];
    const v1 = v1Part.split('=')[1];

    if (!ts || !v1) {
      console.warn('Could not extract timestamp or signature');
      return false;
    }

    const payload = `${ts}:${JSON.stringify(body)}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return generatedSignature === v1;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};