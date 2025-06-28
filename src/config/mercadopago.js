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
  // ★ Configuración especial para desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Modo desarrollo: Verificación de firma desactivada');
    return true; // Solo en desarrollo!
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) throw new Error('Secret no configurada');

  const [tsPart, v1Part] = (signatureHeader || '').split(',');
  const timestamp = tsPart?.split('=')[1];
  const receivedSig = v1Part?.split('=')[1];

  if (!timestamp || !receivedSig) {
    console.error('Formato de firma inválido');
    return false;
  }

  // ★ Punto crítico: Prepara el payload exactamente como MP
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;

  const expectedSig = crypto
    .createHmac('sha256', secret.trim())
    .update(payload)
    .digest('hex');

  console.log('=== DEBUG FIRMA ===');
  console.log('Payload:', payload.substring(0, 100) + '...');
  console.log('Firma esperada:', expectedSig);
  console.log('Firma recibida:', receivedSig);

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
};