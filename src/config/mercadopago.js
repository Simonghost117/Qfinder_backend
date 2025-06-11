import { MercadoPagoConfig } from 'mercadopago';
import crypto from 'crypto';

export const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
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

export const verifyWebhookSignature = (payload, signatureHeader) => {
  try {
    if (!signatureHeader) {
      console.error('❌ Header de firma no encontrado');
      return false;
    }

    // Extraer timestamp y firma del header
    const signatureParts = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) signatureParts[key.trim()] = value.trim();
    });

    const timestamp = signatureParts.ts;
    const receivedSignature = signatureParts.v1;
    
    if (!timestamp || !receivedSignature) {
      console.error('❌ Formato de firma inválido:', signatureHeader);
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ MERCADOPAGO_WEBHOOK_SECRET no configurado');
      return false;
    }

    // IMPORTANTE: No modificar el payload de ninguna manera
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Crear la firma esperada
    const dataToSign = `${timestamp}:${payloadString}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    // Comparación exacta
    const isValid = receivedSignature === generatedSignature;
    
    if (!isValid) {
      console.error('❌ Firma no válida - Detalles:', {
        received: receivedSignature,
        generated: generatedSignature,
        timestamp,
        payloadLength: payloadString.length,
        dataToSignLength: dataToSign.length,
        secretConfigured: !!secret,
        // Depuración adicional
        payloadFirst100: payloadString.substring(0, 100),
        generatedFirst100: generatedSignature.substring(0, 100),
        receivedFirst100: receivedSignature.substring(0, 100)
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error validando firma webhook:', error.message);
    return false;
  }
};