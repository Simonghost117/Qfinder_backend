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
  
  // Parsear el header correctamente
  const [tsPart, sigPart] = signatureHeader.split(',');
  const timestamp = tsPart.split('=')[1];
  const receivedSig = sigPart.split('=')[1].trim();
  
  console.log('Timestamp:', timestamp);
  console.log('Received signature:', receivedSig);
  
  // Verificar que el secret esté correctamente configurado
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Webhook secret not configured');
  }
  
  // Generar la firma esperada
  const dataToSign = `${timestamp}.${rawBody.toString('utf8')}`;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');

  // Agrega estos logs de depuración aquí
  if (receivedSig !== generatedSignature) {
    console.log('🔍 Detalles de fallo de firma:');
    console.log('✉️ rawBody:', rawBody.toString('utf8'));
    console.log('🔑 Secreto:', secret);
    console.log('🕓 Timestamp:', timestamp);
    console.log('📨 Firma recibida:', receivedSig);
    console.log('🛠 Firma generada:', generatedSignature);
  }

  console.log('Generated signature:', generatedSignature);
  
  // Comparación segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(generatedSignature, 'hex')
  );
};