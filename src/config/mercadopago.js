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

// En mercadopago.js - modificar la función verifyWebhookSignature
export const verifyWebhookSignature = (payload, signatureHeader) => {
  try {
    if (!signatureHeader) {
      console.error('Header de firma no encontrado');
      return false;
    }

    // Parsear el header de firma
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        signatureParts[key.trim()] = value.trim();
      }
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;
    
    if (!timestamp || !receivedSignature) {
      console.error('Formato de firma inválido:', signatureHeader);
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado');
      return false;
    }

    // IMPORTANTE: Asegurarse que el payload sea string y no esté modificado
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Crear la firma esperada
    const dataToSign = `${timestamp}:${payloadString}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Comparación segura
    const isValid = receivedSignature === generatedSignature;
    
    if (!isValid) {
      console.error('Firma no válida', {
        received: receivedSignature,
        generated: generatedSignature,
        timestamp,
        payloadSample: payloadString.substring(0, 100) + '...',
        signatureHeader
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error validando firma webhook:', error);
    return false;
  }
};