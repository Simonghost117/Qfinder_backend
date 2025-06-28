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
  // 1. Validación básica
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error('Secreto no configurado');
  }
  
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
  
  if (!signatureHeader) {
    throw new Error('Firma faltante');
  }

  // 2. Extraer componentes de la firma
  const signatureParts = signatureHeader.split(',');
  const signatureData = {};
  signatureParts.forEach(part => {
    const [key, value] = part.split('=');
    signatureData[key.trim()] = value.trim();
  });

  const timestamp = signatureData.ts;
  const receivedSig = signatureData.v1;

  if (!timestamp || !receivedSig) {
    throw new Error('Formato de firma inválido');
  }

  // 3. Versión CORRECTA del payload (según implementación real de MP)
  const bodyString = rawBody.toString('utf8');
  const payload = `${timestamp}.${bodyString}`;

  // 4. Generar firma EXACTA como Mercado Pago
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8') // Codificación explícita
    .digest('hex');

  // 5. Comparación segura
  try {
    // Primero comparar directamente
    if (crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    )) {
      return true;
    }

    // Si falla, probar versión alternativa (por si MP cambia el formato)
    const altPayload = timestamp + bodyString;
    const altSig = crypto
      .createHmac('sha256', secret)
      .update(altPayload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(altSig, 'hex')
    );
  } catch (e) {
    console.error('Error en comparación:', e);
    return false;
  }
};