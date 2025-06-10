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

// Verificación mejorada de firmas para webhooks
export const verifyWebhookSignature = (body, signatureHeader, secret) => {
  if (!signatureHeader || !secret) {
    console.warn('⚠️ Faltan parámetros para verificación');
    return false;
  }

  try {
    // Parsear la firma recibida
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

    // Preparar el payload para verificación
    let payload;
    if (typeof body === 'string') {
      payload = `${timestamp}:${body}`;
    } else if (Buffer.isBuffer(body)) {
      payload = `${timestamp}:${body.toString('utf8')}`;
    } else {
      payload = `${timestamp}:${JSON.stringify(body)}`;
    }

    // Generar la firma esperada
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Comparación segura contra timing attacks
    const signatureMatches = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!signatureMatches) {
      console.error('❌ Firma no coincide', {
        payload,
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