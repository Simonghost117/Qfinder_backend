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
  // 1. Validación de parámetros
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET no configurada');
  }
  
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
  
  if (!signatureHeader) {
    throw new Error('Encabezado de firma faltante');
  }

  // 2. Extracción de componentes (formato: "ts=123456789,v1=abcdef123456")
  const parts = signatureHeader.split(',');
  const signatureParts = {};
  
  parts.forEach(part => {
    const [key, value] = part.split('=');
    signatureParts[key.trim()] = value.trim();
  });

  const timestamp = signatureParts.ts;
  const receivedSig = signatureParts.v1;

  if (!timestamp || !receivedSig) {
    throw new Error('Formato de firma inválido. Se esperaba "ts=timestamp,v1=signature"');
  }

  // 3. Preparación del payload (CRÍTICO: usar el rawBody exacto)
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;

  // 4. Generación de firma esperada
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
console.log('🔑 Secret:', secret);
console.log('📝 Payload:', `${timestamp}.${rawBody.toString('utf8')}`);
console.log('🔍 Firma recibida:', receivedSig);
console.log('🔍 Firma esperada:', expectedSig);
  // 5. Comparación segura contra timing attacks
  const receivedSigBuffer = Buffer.from(receivedSig, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSig, 'hex');
  
  if (receivedSigBuffer.length !== expectedSigBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedSigBuffer, expectedSigBuffer);
};
  