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
  // Validación básica de parámetros
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
    console.error('❌ Webhook secret no configurado');
    return false;
  }
  
  if (!signatureHeader) {
    console.error('❌ Falta el header x-signature');
    return false;
  }

  // Parsear el header de firma
  const signatureParts = signatureHeader.split(',');
  if (signatureParts.length !== 2) {
    console.error('❌ Formato de firma incorrecto');
    return false;
  }

  const [tsPart, v1Part] = signatureParts;
  const timestamp = tsPart.split('=')[1]?.trim();
  const receivedSig = v1Part.split('=')[1]?.trim();

  if (!timestamp || !receivedSig) {
    console.error('❌ Estructura de firma inválida');
    return false;
  }

  try {
    // Crear el payload exacto para verificación
    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    
    // Calcular la firma esperada
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');

    // Comparación segura contra timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    console.log('🔍 Resultado verificación:', {
      timestamp,
      payloadPreview: payload.substring(0, 50) + '...',
      receivedSig,
      expectedSig,
      isValid
    });

    return isValid;
  } catch (error) {
    console.error('❌ Error al verificar firma:', error);
    return false;
  }
};
export function testWebhookVerification() {
  const testSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'TEST_SECRET';
  const testBody = '{"action":"test"}';
  const testTimestampSec = Math.floor(Date.now() / 1000);
  
  const testSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testTimestampSec}.${testBody}`, 'utf8')
    .digest('hex');
  
  const testHeader = `ts=${testTimestampSec * 1000},v1=${testSignature}`;
  
  console.log('\n🧪 TEST CON TIMESTAMP CORRECTO (segundos)');
  const result = verifyWebhookSignature(Buffer.from(testBody), testHeader);
  console.log('Resultado:', result ? '✅ FIRMA VÁLIDA' : '❌ FIRMA INVÁLIDA');
  
  return result;
}