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
    // 1. Parsear el header
    const parts = signatureHeader.split(',');
    let receivedSig, timestamp;
    
    parts.forEach(part => {
      if (part.startsWith('v1=')) {
        receivedSig = part.split('=')[1];
      } else if (part.startsWith('ts=')) {
        timestamp = part.split('=')[1];
      }
    });

    if (!timestamp || !receivedSig) return false;

    // 2. Convertir timestamp a segundos
    const timestampSec = Math.floor(parseInt(timestamp) / 1000);
    
    // 3. Crear payload CORRECTO (sin conversión a string)
    const timestampBuffer = Buffer.from(`${timestampSec}.`);
    const payload = Buffer.concat([timestampBuffer, rawBody]);
    
    // 4. Calcular HMAC
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');

    // 5. Comparación segura
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    return false;
  }
};
