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
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  
  if (!secret) {
    console.error('❌ MERCADOPAGO_WEBHOOK_SECRET no está configurada');
    return false;
  }

  if (!signatureHeader || !rawBody) {
    console.error('❌ Faltan signatureHeader o rawBody');
    return false;
  }

  try {
    // Extrae timestamp y firma
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1];
    const receivedSig = v1Part?.split('=')[1];

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // Prepara el payload - IMPORTANTE: sin modificar el rawBody
    const payloadToSign = `${timestamp}.${rawBody}`;
    
    console.log('🔑 Secret:', secret.substring(0, 2) + '...' + secret.slice(-2));
    console.log('📝 Payload:', payloadToSign.substring(0, 50) + '...');

    // Genera firma esperada
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    console.log(`🔐 Firma esperada: ${expectedSig}`);
    console.log(`📩 Firma recibida: ${receivedSig}`);

    // Comparación segura
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (err) {
    console.error('💥 Error en verificación:', err);
    return false;
  }
};
