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
      console.error('❌ Faltan parámetros para verificación');
      return false;
    }

    // Extraer componentes de la firma
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) signatureParts[key.trim()] = value.trim();
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;

    if (!timestamp || !receivedSignature) {
      console.error('❌ Firma malformada - falta timestamp o firma v1');
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ Secret no configurado en variables de entorno');
      throw new Error('MERCADOPAGO_WEBHOOK_SECRET no definido');
    }

    // Prepara los datos para firmar (timestamp + cuerpo RAW)
    const dataToSign = `${timestamp}.${rawBody}`;

    // Genera la firma esperada
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Comparación segura contra ataques de timing
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );

    if (!isValid) {
      console.error('⚠️ Verificación de firma fallida', {
        receivedSignature,
        generatedSignature,
        timestamp,
        dataToSign: dataToSign.length > 100 ? dataToSign.slice(0, 100) + '...' : dataToSign,
      });
    }

    return isValid;
  } catch (err) {
    console.error('❌ Error verificando firma:', err.message);
    return false;
  }
};