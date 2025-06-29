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
  // Validaciones básicas
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error('❌ Webhook secret no configurado');
    return false;
  }
  
  if (!signatureHeader) {
    console.error('❌ Header de firma faltante');
    return false;
  }

  // Extraer componentes de la firma
  const signatureParts = signatureHeader.split(',');
  if (signatureParts.length !== 2) {
    console.error('❌ Formato de firma inválido');
    return false;
  }

  const tsPart = signatureParts[0].split('=');
  const v1Part = signatureParts[1].split('=');
  
  if (tsPart.length !== 2 || v1Part.length !== 2) {
    console.error('❌ Estructura de firma incorrecta');
    return false;
  }

  const timestamp = tsPart[1];
  const receivedSig = v1Part[1];

  // Validar timestamp (debe ser numérico)
  if (!/^\d+$/.test(timestamp)) {
    console.error('❌ Timestamp inválido');
    return false;
  }

  // Generar firma esperada
  try {
    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
      .update(payload)
      .digest('hex');

    // Comparación segura
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
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