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
  try {
    // Validación básica
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }
    
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
    
    if (!signatureHeader) {
      console.error('❌ Header de firma faltante');
      return false;
    }

    // Parseo del header de firma
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1]?.trim();
    const receivedSig = v1Part?.split('=')[1]?.trim();

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // Generación de firmas alternativas
    const bodyString = rawBody.toString('utf8');
    const payloads = [
      `${timestamp}.${bodyString}`,  // Versión oficial
      timestamp + bodyString,       // Versión sin punto
      bodyString                    // Solo el body
    ];

    // Comparación exhaustiva
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    return payloads.some(payload => {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      try {
        return crypto.timingSafeEqual(
          receivedBuffer,
          Buffer.from(expectedSig, 'hex')
        );
      } catch (e) {
        console.error('Error en comparación:', e);
        return false;
      }
    });
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};