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
  console.log('Received signature header:', signatureHeader);
  console.log('Raw body length:', rawBody?.length);

  const [tsPart, sigPart] = signatureHeader.split(',');
  const timestamp = tsPart.split('=')[1];
  const receivedSig = sigPart.split('=')[1].trim();

  console.log('Timestamp:', timestamp);
  console.log('Received signature:', receivedSig);

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Webhook secret not configured');
  }

  // 🔐 Firma precisa usando Buffer, sin .toString
  const dataToSign = Buffer.concat([
    Buffer.from(`${timestamp}.`), // timestamp + punto
    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody) // rawBody como buffer
  ]);

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');

  if (receivedSig !== generatedSignature) {
    console.log('🔍 Detalles de fallo de firma:');
    console.log('✉️ rawBody:', rawBody.toString('utf8'));
    console.log('🔑 Secreto:', secret);
    console.log('🕓 Timestamp:', timestamp);
    console.log('📨 Firma recibida:', receivedSig);
    console.log('🛠 Firma generada:', generatedSignature);
  }

  console.log('Generated signature:', generatedSignature);

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(generatedSignature, 'hex')
  );
};
