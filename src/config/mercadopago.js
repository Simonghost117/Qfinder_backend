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

export const verifyWebhookSignature = (req) => {
  try {
    const signatureHeader = req.headers['x-signature'];
    
    if (!signatureHeader) {
      console.error('Header x-signature no encontrado');
      return false;
    }

    // Extraer timestamp y firma del header
    const [tsPart, v1Part] = signatureHeader.split(',');
    const timestamp = tsPart.split('=')[1];
    const signature = v1Part.split('=')[1];
    
    if (!timestamp || !signature) {
      console.error('Formato de firma inválido', signatureHeader);
      return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado');
      return false;
    }

    // Usar el body raw (debe configurarse en el middleware)
    const payload = req.rawBody || JSON.stringify(req.body);
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}:${payload}`)
      .digest('hex');

    const isValid = signature === generatedSignature;
    
    if (!isValid) {
      console.error('Firma no válida', {
        received: signature,
        generated: generatedSignature,
        timestamp,
        payload: payload.substring(0, 100) + '...'
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error validando firma webhook:', error);
    return false;
  }
};