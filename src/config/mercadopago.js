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
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('Webhook secret no configurado');
  if (!signatureHeader) throw new Error('Header de firma faltante');

  // 2. Parsear la firma
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1]?.trim();
  const receivedSig = v1Part?.split('=')[1]?.trim();
  if (!timestamp || !receivedSig) throw new Error('Formato de firma inválido');

  // 3. Versiones alternativas del payload (según implementaciones de MP)
  const bodyString = rawBody.toString('utf8');
  
  // Versión 1: timestamp.body (documentación oficial)
  const payload1 = `${timestamp}.${bodyString}`;
  
  // Versión 2: timestampbody (sin punto)
  const payload2 = timestamp + bodyString;
  
  // Versión 3: body solo (alternativa reportada)
  const payload3 = bodyString;

  // 4. Generar todas las posibles firmas
  const signatures = [
    crypto.createHmac('sha256', secret).update(payload1, 'utf8').digest('hex'),
    crypto.createHmac('sha256', secret).update(payload2, 'utf8').digest('hex'),
    crypto.createHmac('sha256', secret).update(payload3, 'utf8').digest('hex')
  ];

  // 5. Comparación exhaustiva
  try {
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    return signatures.some(sig => 
      crypto.timingSafeEqual(receivedBuffer, Buffer.from(sig, 'hex'))
    );
  } catch (e) {
    console.error('Error en comparación:', e);
    return false;
  }
};