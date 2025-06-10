import { MercadoPagoConfig } from 'mercadopago';
import crypto from 'crypto';

// Configuración principal de MercadoPago
export const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 15000,
    idempotencyKey: `mp-${Date.now()}`,
    integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID,
    sandbox: process.env.NODE_ENV !== 'production'
  }
});
export const configureMercadoPago = () => {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: {
      timeout: 15000,
      sandbox: process.env.NODE_ENV !== 'production'
    }
  });
};
export const verifyWebhookSignature = (body, signatureHeader, secret) => {
  if (!signatureHeader || !secret) {
    console.warn('⚠️ Faltan parámetros para verificación');
    return false;
  }

  try {
    const parts = signatureHeader.split(',');
    const signatureParts = {};

    parts.forEach(part => {
      const [key, value] = part.split('=');
      signatureParts[key] = value;
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;

    if (!timestamp || !receivedSignature) {
      console.warn('⚠️ Firma mal formada');
      return false;
    }

    // Preparar payload SIN convertir Buffer a string
    let payload;
    if (Buffer.isBuffer(body)) {
      payload = Buffer.concat([Buffer.from(`${timestamp}:`), body]);
    } else if (typeof body === 'string') {
      payload = `${timestamp}:${body}`;
    } else {
      payload = `${timestamp}:${JSON.stringify(body)}`;
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const signatureMatches = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!signatureMatches) {
      console.error('❌ Firma no coincide', {
        payload: payload.toString(), // para debug
        receivedSignature,
        generatedSignature
      });
    }

    return signatureMatches;
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};
