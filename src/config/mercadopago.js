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
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  
  // Validaciones básicas
  if (!secret) throw new Error('Secret no configurada');
  if (!signatureHeader) throw new Error('Firma no recibida');
  if (!rawBody) throw new Error('Body vacío');

  // Extracción de componentes
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1];
  const receivedSig = v1Part?.split('=')[1];

  if (!timestamp || !receivedSig) {
    throw new Error('Formato de firma inválido');
  }

  // ★★★★ Punto crítico ★★★★
  // Usa el body exactamente como viene, sin convertirlo a JSON
  const payload = `${timestamp}.${rawBody}`;
  
  // Generación de firma
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Comparación segura
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
};