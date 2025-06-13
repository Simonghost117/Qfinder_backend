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
        console.log('=== VERIFICACIÓN DEL SECRET ===');
    console.log('Longitud del secret:', process.env.MERCADOPAGO_WEBHOOK_SECRET?.length);
    console.log('Secret exacto:', `"${process.env.MERCADOPAGO_WEBHOOK_SECRET}"`);
    console.log('==============================');
    if (!signatureHeader || !rawBody) {
      console.error('❌ Faltan parámetros para verificación');
      return false;
    }

    // Extraer componentes de la firma
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart.split('=')[1];
    const receivedSignature = v1Part.split('=')[1];

    if (!timestamp || !receivedSignature) {
      console.error('❌ Firma malformada - falta timestamp o firma v1');
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ Secret no configurado en variables de entorno');
      throw new Error('MERCADOPAGO_WEBHOOK_SECRET no definido');
    }

    // Prepara los datos para firmar (timestamp + cuerpo RAW EXACTO)
    const dataToSign = `${timestamp}.${rawBody}`;

    // Genera la firma esperada
    const generatedSignature = crypto
      .createHmac('sha256', secret.trim()) // .trim() por si hay espacios accidentalmente
      .update(dataToSign)
      .digest('hex');

    console.log('=== DEBUG FIRMA ===');
    console.log('Secret:', `"${secret}"`);
    console.log('Timestamp:', timestamp);
    console.log('Datos a firmar (50 primeros chars):', dataToSign.substring(0, 50));
    console.log('Firma recibida:', receivedSignature);
    console.log('Firma generada:', generatedSignature);
    console.log('===================');

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
    console.error('❌ Error verificando firma:', err);
    return false;
  }
};