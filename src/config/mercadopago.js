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
  // 1. Validación de parámetros
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET no configurada');
  }
  
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
  
  if (!signatureHeader) {
    throw new Error('Encabezado de firma faltante');
  }

  // 2. Extracción de componentes
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1]?.trim();
  const receivedSig = v1Part?.split('=')[1]?.trim();

  if (!timestamp || !receivedSig) {
    throw new Error('Formato de firma inválido');
  }

  // 3. Preparación del payload (PUNTO CRÍTICO)
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;

  // 4. Generación de firma
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // 5. Comparación segura
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
};
  