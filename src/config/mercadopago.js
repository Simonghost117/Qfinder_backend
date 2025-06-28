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
  console.log('🔑 Secret key:', secret ? '****' : 'NO CONFIGURADA');

  if (!secret || !signatureHeader || !rawBody) {
    console.error('❌ Faltan parámetros para verificación');
    return false;
  }

  try {
    const parts = signatureHeader.split(',');
    const tsPart = parts.find(p => p.startsWith('ts='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    
    if (!tsPart || !v1Part) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    const timestamp = tsPart.split('=')[1];
    const receivedSig = v1Part.split('=')[1];
    const payloadToSign = `${timestamp}.${rawBody}`; // rawBody ya es string

    console.log('📝 Payload to sign:', payloadToSign.substring(0, 100) + '...');

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    console.log(`🔐 Firma esperada: ${expectedSig}`);
    console.log(`📩 Firma recibida: ${receivedSig}`);

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (err) {
    console.error('💥 Error en verificación:', err);
    return false;
  }
};
