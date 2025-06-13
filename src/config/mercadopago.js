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



export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  if (!secret || !signatureHeader || !rawBody) return false;

  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const receivedSig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !receivedSig) return false;

  const payloadToSign = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payloadToSign)
    .digest('hex');

  console.log(`🧪 Firma esperada: ${expectedSig}`);
  console.log(`📨 Firma recibida: ${receivedSig}`);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (err) {
    console.error('Error comparando firmas:', err.message);
    return false;
  }
};
