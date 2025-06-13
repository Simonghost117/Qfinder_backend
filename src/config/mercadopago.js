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



export const verifyWebhookSignature = (rawBody, receivedSignature) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim(); // o directamente hardcoded si estás probando

  // ✅ LOGS CRÍTICOS AQUÍ
  console.log('🧪 Secreto cargado (string):', JSON.stringify(secret));
  console.log('📏 Longitud del secreto:', secret?.length);

  if (!secret) {
    console.warn('⚠️ No se configuró MERCADOPAGO_WEBHOOK_SECRET.');
    return true;
  }

  if (!receivedSignature) {
    console.error('❌ Encabezado de firma no proporcionado');
    return false;
  }

  const payloadBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody);

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBuffer)
    .digest('hex');

  const parsedSignature = receivedSignature
    .split(',')
    .find(part => part.trim().startsWith('v1='))
    ?.split('=')[1];

  if (!parsedSignature) {
    console.error('❌ No se encontró la firma v1 en la cabecera');
    return false;
  }

  console.log('🔍 Verificación de firma:');
  console.log('✉️ Cuerpo recibido:', payloadBuffer.toString('utf8'));
  console.log('📨 Firma recibida (v1):', parsedSignature);
  console.log('🛠 Firma generada:', generatedSignature);

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(parsedSignature, 'hex'),
      Buffer.from(generatedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('❌ La firma no coincide');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error al comparar firmas:', error.message);
    return false;
  }
};

