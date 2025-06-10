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
  console.log('🔍 Verificando firma...');
  console.log('Body recibido:', typeof body, body);
  console.log('Signature header:', signatureHeader);

  if (!signatureHeader) {
    console.warn('⚠️ No signature header present');
    return false;
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  console.log('Secret key:', secret ? '***' : 'UNDEFINED!');

  try {
    const [tsPart, v1Part] = signatureHeader.split(',');
    const ts = tsPart?.split('=')[1];
    const v1 = v1Part?.split('=')[1];

    console.log('Timestamp:', ts);
    console.log('Firma recibida (v1):', v1);

    if (!ts || !v1) {
      console.warn('⚠️ Firma mal formada');
      return false;
    }

    const payload = `${ts}:${typeof body === 'string' ? body : JSON.stringify(body)}`;
    console.log('Payload usado:', payload);

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    console.log('Firma generada:', generatedSignature);
    console.log('Coinciden?:', generatedSignature === v1);

    return generatedSignature === v1;
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};