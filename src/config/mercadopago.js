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
    console.log('🔐 Verificando firma...');
    console.log('📌 Secret configurado:', process.env.MERCADOPAGO_WEBHOOK_SECRET ? '***' : 'NO CONFIGURADO');
    console.log('📌 Signature header:', signatureHeader);
    
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.error('❌ Webhook secret no configurado');
      return false;
    }
    
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET.trim();
    
    if (!signatureHeader) {
      console.error('❌ Header de firma faltante');
      return false;
    }

    // Parseo del header de firma
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart?.split('=')[1]?.trim();
    const receivedSig = v1Part?.split('=')[1]?.trim();

    console.log('📌 Timestamp:', timestamp);
    console.log('📌 Firma recibida:', receivedSig);

    if (!timestamp || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    // Generación de firmas alternativas
    const bodyString = rawBody.toString('utf8');
    console.log('📌 Body string:', bodyString.substring(0, 50) + '...');
    
    const payloads = [
      `${timestamp}.${bodyString}`,  // Versión oficial
      timestamp + bodyString,       // Versión sin punto
      bodyString                    // Solo el body
    ];

    // Comparación exhaustiva
    const receivedBuffer = Buffer.from(receivedSig, 'hex');
    
    return payloads.some((payload, i) => {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      console.log(`🔍 Comparando variante ${i + 1}:`);
      console.log('🔑 Payload:', payload.substring(0, 50) + '...');
      console.log('🔑 Firma esperada:', expectedSig);
      
      try {
        const match = crypto.timingSafeEqual(
          receivedBuffer,
          Buffer.from(expectedSig, 'hex')
        );
        
        console.log(`✅ Variante ${i + 1}: ${match ? 'COINCIDE' : 'no coincide'}`);
        return match;
      } catch (e) {
        console.error(`❌ Error en comparación ${i + 1}:`, e);
        return false;
      }
    });
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};

export function testWebhookVerification() {
  const testSecret = 'TEST_SECRET'; // Usa tu secret real para pruebas reales
  const testBody = '{"test":"value"}';
  const testTimestamp = Math.floor(Date.now() / 1000);
  
  const testSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testTimestamp}.${testBody}`, 'utf8')
    .digest('hex');
  
  const testHeader = `ts=${testTimestamp},v1=${testSignature}`;
  
  console.log('\n🧪 TEST WEBHOOK SIGNATURE VERIFICATION');
  console.log('====================================');
  console.log('Secret:', testSecret);
  console.log('Body:', testBody);
  console.log('Timestamp:', testTimestamp);
  console.log('Generated signature:', testSignature);
  console.log('Full header:', testHeader);
  
  const result = verifyWebhookSignature(Buffer.from(testBody), testHeader);
  
  console.log('\nResultado:', result ? '✅ FIRMA VÁLIDA' : '❌ FIRMA INVÁLIDA');
  console.log('====================================\n');
  
  return result;
}

// Para ejecutar automáticamente en desarrollo
if (process.env.NODE_ENV === 'development') {
  testWebhookVerification();
}