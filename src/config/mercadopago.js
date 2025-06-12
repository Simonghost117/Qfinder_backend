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
    // 1. Validación básica de parámetros
    if (!signatureHeader || !rawBody) {
      console.error('❌ Faltan parámetros esenciales');
      return false;
    }

    // 2. Parsear el header de firma
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) signatureParts[key.trim()] = value.trim();
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;

    if (!timestamp || !receivedSignature) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // 3. Obtener el secret (asegúrate de que coincide EXACTAMENTE con el de MP)
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }

    // 4. Preparar el payload CORRECTO (usar el rawBody exacto)
    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const dataToSign = `${timestamp}.${payload}`;

    // 5. Generar la firma esperada
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // 6. Comparación SEGURA de las firmas (a prueba de timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );

    if (!isValid) {
      console.error('❌ Firma no válida', {
        received: receivedSignature?.substring(0, 32) + '...',
        generated: generatedSignature?.substring(0, 32) + '...',
        timestamp,
        payloadLength: payload.length,
        dataToSign: dataToSign.substring(0, 100) + '...' // Log parcial para debug
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error crítico validando firma:', {
      message: error.message,
      stack: error.stack,
      rawBodyType: typeof rawBody,
      signatureHeader
    });
    return false;
  }
};

