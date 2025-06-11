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

export const verifyWebhookSignature = (payload, signatureHeader) => {
  try {
    if (!signatureHeader) {
      console.error('Header de firma no encontrado');
      return false;
    }

    // Extraer timestamp y firma
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        signatureParts[key.trim()] = value.trim();
      }
    });

    const timestamp = signatureParts.ts;
    const signature = signatureParts.v1;
    
    if (!timestamp || !signature) {
      console.error('Formato de firma inválido:', signatureHeader);
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado');
      return false;
    }

    // Asegurarse de que el payload sea exactamente el mismo que recibió MercadoPago
    const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}:${payloadString}`)
      .digest('hex');

    // Comparación segura contra timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );
    
    if (!isValid) {
      console.error('Firma no válida', {
        received: signature,
        generated: generatedSignature,
        timestamp,
        payload: payloadString.substring(0, 100) + '...',
        signatureHeader
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error validando firma webhook:', error);
    return false;
  }
};