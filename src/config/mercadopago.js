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

export const verifyWebhookSignature = (body, signatureHeader, secret) => {
  if (!signatureHeader || !secret) {
    console.warn('⚠️ Faltan parámetros para verificación');
    return false;
  }

  try {
    // Extraer solo la firma v1 (MercadoPago a veces envía solo v1)
    const signature = signatureHeader.includes('v1=') 
      ? signatureHeader.split('v1=')[1] 
      : signatureHeader;

    // Preparar el payload para verificación
    let payload;
    if (typeof body === 'string') {
      payload = body;
    } else if (body instanceof Buffer) {
      payload = body.toString();
    } else {
      payload = JSON.stringify(body);
    }

    // Generar firma HMAC-SHA256
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};