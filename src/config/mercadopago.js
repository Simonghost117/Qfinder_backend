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
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }
    
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
    
    if (!signatureHeader) {
      console.error('❌ Header de firma faltante');
      return false;
    }

    // Parsear el header de firma
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1]?.trim();
    const receivedSig = v1Part?.split('=')[1]?.trim();

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // Convertir el body a string manteniendo exactamente lo recibido
    const bodyString = rawBody.toString('utf8');
    
    // Crear el payload exacto que MercadoPago firma
    const payload = `${timestamp}.${bodyString}`;
    
    // Calcular la firma esperada
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Comparación segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
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