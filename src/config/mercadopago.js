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
      throw new Error('Webhook secret no configurado');
    }
    
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
    
    if (!signatureHeader) {
      throw new Error('Header de firma faltante');
    }

    // Extraer componentes de la firma
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

    // Versiones alternativas del payload
    const bodyString = rawBody.toString('utf8');
    const payloadVariants = [
      `${timestamp}.${bodyString}`,  // Documentación oficial
      timestamp + bodyString,        // Alternativa sin punto
      bodyString                     // Solo body
    ];

    // Generar firmas para todas las variantes
    const signatures = payloadVariants.map(payload =>
      crypto.createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex')
    );

    // Comparación segura
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    return signatures.some(sig =>
      crypto.timingSafeEqual(receivedBuffer, Buffer.from(sig, 'hex'))
    );
  } catch (error) {
    console.error('Error en verifyWebhookSignature:', error);
    return false;
  }
};