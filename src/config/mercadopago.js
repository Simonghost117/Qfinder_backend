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
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  try {
    if (!signatureHeader || !rawBody) {
      console.error('Missing signature header or raw body');
      return false;
    }

    // Extraer timestamp y firma de forma más robusta
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        signatureParts[key.trim()] = value.trim().replace(/^"|"$/g, '');
      }
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;

    if (!timestamp || !receivedSignature) {
      console.error('Invalid signature format - missing ts or v1');
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return false;
    }

    // Asegurar que el rawBody es un string
    const requestBody = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    
    // Crear payload - importante sin espacios adicionales
    const dataToSign = `${timestamp}.${requestBody}`.trim();

    // Calcular firma
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Comparación segura
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );

    if (!isValid) {
      console.error('Signature verification failed', {
        receivedSignature,
        generatedSignature,
        timestamp,
        dataToSign: dataToSign.substring(0, 100) + '...',
        secretPresent: !!secret
      });
    }

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};