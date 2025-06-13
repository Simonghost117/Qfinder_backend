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
  const secret = 'ca39d4db46bd8328f60bf0c98d6b4009ad0c19a0f2ee4156349aa16a219293aa';

  if (!secret) {
    console.warn('⚠️ No se configuró MERCADOPAGO_WEBHOOK_SECRET. Se omite la validación de firma.');
    return true; // ⚠️ Solo usar esto si confías en el origen (por ejemplo, en desarrollo)
  }

  if (!receivedSignature) {
    console.error('❌ Encabezado de firma no proporcionado');
    return false;
  }

  // Convertir el cuerpo recibido en buffer si no lo es
  const payloadBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody);

  // Generar firma HMAC usando el cuerpo y el secreto
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBuffer)
    .digest('hex');

  // Extraer el valor de v1 de la cabecera de firma
  const parsedSignature = receivedSignature
    .split(',')
    .find(part => part.trim().startsWith('v1='))
    ?.split('=')[1];

  if (!parsedSignature) {
    console.error('❌ No se encontró la firma v1 en la cabecera');
    return false;
  }

  // Mostrar información para depuración
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

