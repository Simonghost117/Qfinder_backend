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
  // Validación de parámetros
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('Secret no configurado');
  if (!signatureHeader) throw new Error('Firma faltante');

  // Extraer componentes
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1]?.trim();
  const receivedSig = v1Part?.split('=')[1]?.trim();
  if (!timestamp || !receivedSig) throw new Error('Formato inválido');

  // Versión 1: Payload estándar (para comparación)
  const payloadStandard = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSigStandard = crypto
    .createHmac('sha256', secret)
    .update(payloadStandard)
    .digest('hex');

  // Versión 2: Payload sin puntos (alternativa MP)
  const payloadNoDots = timestamp + rawBody.toString('utf8');
  const expectedSigNoDots = crypto
    .createHmac('sha256', secret)
    .update(payloadNoDots)
    .digest('hex');

  // Debug
  console.log('🔍 Comparación de firmas:', {
    received: receivedSig,
    standard: expectedSigStandard,
    noDots: expectedSigNoDots
  });

  // Comparación con ambas versiones
  return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSigStandard, 'hex')
    ) || crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSigNoDots, 'hex')
    );
};