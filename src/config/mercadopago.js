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
  try {
    const parts = signatureHeader.split(',');
    let receivedSig, timestamp;
    
    for (const part of parts) {
      if (part.startsWith('v1=')) receivedSig = part.split('=')[1];
      if (part.startsWith('ts=')) timestamp = part.split('=')[1];
    }

    if (!timestamp || !receivedSig) return false;

    // ¡NO convertir a segundos! Usar el timestamp tal cual
    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');
console.log('ℹ️ Secreto usado:', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim());
console.log('ℹ️ Payload completo:', payload);
console.log('ℹ️ Firma recibida:', receivedSig);
console.log('ℹ️ Firma generada:', expectedSig);
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    return false;
  }
  
};