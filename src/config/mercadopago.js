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
  console.log('🔍 Verificando firma...');
  
  if (!signatureHeader || !secret) {
    console.warn('⚠️ Faltan parámetros para verificación');
    return false;
  }

  try {
    // Extraer timestamp y firma del header
    const parts = signatureHeader.split(',');
    const signatureParts = {};
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      signatureParts[key] = value;
    });

    const ts = signatureParts.ts;
    const v1 = signatureParts.v1;

    if (!ts || !v1) {
      console.warn('⚠️ Firma mal formada');
      return false;
    }

    // Preparar el payload para verificación
    let payload;
    if (typeof body === 'string') {
      // Si es string (body raw), usarlo directamente
      payload = `${ts}:${body}`;
    } else if (body instanceof Buffer) {
      // Si es Buffer, convertirlo a string
      payload = `${ts}:${body.toString()}`;
    } else {
      // Si es objeto, convertirlo a JSON stringificado
      payload = `${ts}:${JSON.stringify(body)}`;
    }

    console.log('Payload usado para firma:', payload);

    // Generar firma HMAC-SHA256
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    console.log('Firma recibida:', v1);
    console.log('Firma generada:', generatedSignature);
    console.log('Coinciden?:', generatedSignature === v1);

    return generatedSignature === v1;
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};