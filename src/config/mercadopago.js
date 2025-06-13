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
      console.error('❌ Faltan datos: signatureHeader o rawBody');
      return false;
    }

    // Separar partes del header "ts=...,v1=..."
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
      console.error('❌ Formato de firma inválido - falta ts o v1');
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }

    const requestBody = rawBody.toString('utf8');
    const dataToSign = `${timestamp}.${requestBody}`;

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('⚠️ Verificación de firma fallida', {
        receivedSignature,
        generatedSignature,
        timestamp,
        dataToSign: dataToSign.slice(0, 100) + '...',
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error al verificar la firma:', error);
    return false;
  }
};