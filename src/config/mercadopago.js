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
    if (!signatureHeader || !rawBody) {
      console.error('❌ Faltan parámetros para verificación');
      return false;
    }

    // Extraer componentes de la firma (nuevo formato de MercadoPago)
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1]?.trim();
    const receivedSignature = v1Part?.split('=')[1]?.trim();

    if (!timestamp || !receivedSignature) {
      console.error('❌ Firma malformada - falta timestamp o firma v1');
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error('❌ Secret no configurado en variables de entorno');
      throw new Error('MERCADOPAGO_WEBHOOK_SECRET no definido');
    }

    // Prepara los datos para firmar (timestamp + cuerpo RAW)
    const dataToSign = `${timestamp}.${rawBody.toString('utf8')}`;

    // Genera la firma esperada
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Comparación segura
    const isValid = receivedSignature === generatedSignature;

    if (!isValid) {
      console.error('⚠️ Verificación de firma fallida', {
        receivedSignature,
        generatedSignature,
        timestamp,
        dataToSignLength: dataToSign.length,
      });
    }

    return isValid;
  } catch (err) {
    console.error('❌ Error verificando firma:', {
      error: err.message,
      stack: err.stack
    });
    return false;
  }
};