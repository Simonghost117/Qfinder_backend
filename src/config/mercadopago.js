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


// mercadopago.js (versión corregida)
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  if (!signatureHeader) return false;

  // Parsear dinámicamente
  let receivedSig, timestamp;
  signatureHeader.split(',').forEach(part => {
    const [key, value] = part.split('=');
    if (key === 'v1') receivedSig = value;
    if (key === 'ts') timestamp = value;
  });

  if (!timestamp || !receivedSig) return false;

  const timestampSec = Math.floor(parseInt(timestamp) / 1000); // Milisegundos -> Segundos
  const payload = Buffer.concat([
    Buffer.from(timestampSec + '.'),
    rawBody // Mantener como Buffer
  ]);

  const expectedSig = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET.trim())
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
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