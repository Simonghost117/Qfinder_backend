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
    // 1. Validación básica
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }

    // 2. Parsear el header de firma
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      signatureParts[key.trim()] = value.trim();
    });

    const timestamp = signatureParts.ts;
    const receivedSig = signatureParts.v1;

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // 3. Versiones alternativas del payload
    const bodyString = rawBody.toString('utf8');
    const payloadVariants = [
      `${timestamp}.${bodyString}`,  // Versión documentada
      timestamp + bodyString,        // Versión sin punto
      bodyString                     // Solo el body
    ];

    // 4. Generar todas las posibles firmas
    const signatures = payloadVariants.map(payload => {
      return crypto.createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    });

    // 5. Comparación exhaustiva
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    return signatures.some(sig => {
      try {
        return crypto.timingSafeEqual(
          receivedBuffer, 
          Buffer.from(sig, 'hex')
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