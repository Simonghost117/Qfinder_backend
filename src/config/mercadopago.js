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
    const timestampMs = tsPart?.split('=')[1]?.trim();
    const receivedSig = v1Part?.split('=')[1]?.trim();

    // Convertir timestamp a segundos (MercadoPago usa segundos)
    const timestampSec = Math.floor(parseInt(timestampMs) / 1000);
    
    console.log('📌 Timestamp (ms):', timestampMs);
    console.log('📌 Timestamp (sec):', timestampSec);
    console.log('📌 Firma recibida:', receivedSig);

    if (!timestampMs || !receivedSig) {
      console.error('❌ Formato de firma inválido');
      return false;
    }

    const bodyString = rawBody.toString('utf8');
    console.log('📌 Body string:', bodyString.substring(0, 50) + '...');
    
    // Versión oficial de MercadoPago: timestampEnSegundos.bodyString
    const officialPayload = `${timestampSec}.${bodyString}`;
    
    const payloads = [
      officialPayload,  // Versión CORRECTA con timestamp en segundos
      `${timestampMs}.${bodyString}`,  // Versión con ms por si acaso
      timestampSec + bodyString,       // Versión sin punto
      timestampMs + bodyString,        // Versión sin punto con ms
      bodyString                       // Solo el body
    ];

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