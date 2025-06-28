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
  // 1. Validación de parámetros
  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET no configurada');
  }
  
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
  
  // Debug: Verificar clave secreta
  console.log('🔑 Secret (hex):', Buffer.from(secret).toString('hex'));
  console.log('🔑 Secret length:', secret.length);

  if (!signatureHeader) {
    throw new Error('Encabezado de firma faltante');
  }

  // 2. Extracción de componentes
  const [tsPart, v1Part] = signatureHeader.split(',');
  const timestamp = tsPart?.split('=')[1]?.trim();
  const receivedSig = v1Part?.split('=')[1]?.trim();

  if (!timestamp || !receivedSig) {
    throw new Error('Formato de firma inválido');
  }

  // 3. Preparación del payload (CRÍTICO)
  const bodyString = rawBody.toString('utf8');
  const payload = `${timestamp}.${bodyString}`;
  
  // Debug: Verificar payload
  console.log('📝 Body exacto:', JSON.stringify(bodyString));
  console.log('📝 Body length:', bodyString.length);
  console.log('📝 Payload completo:', payload);

  // 4. Generación de firma
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Debug: Comparación
  console.log('🔍 Firma recibida:', receivedSig);
  console.log('🔍 Firma esperada:', expectedSig);
  console.log('🔍 Longitud recibida:', receivedSig.length);
  console.log('🔍 Longitud esperada:', expectedSig.length);

  // 5. Comparación segura
  try {
    const result = crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
    console.log('🔍 Resultado comparación:', result);
    return result;
  } catch (e) {
    console.error('❌ Error en comparación:', e.message);
    return false;
  }
};