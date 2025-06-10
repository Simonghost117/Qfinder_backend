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
      timeout: 50000,
      idempotencyKey: `mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID,
      sandbox: isSandbox,
      headers: {
        'x-product-id': 'qfinder-app',
        'x-integrator-id': process.env.MERCADOPAGO_INTEGRATOR_ID
      }
    }
  });
};

export const verifyWebhookSignature = (body, signatureHeader, secret) => {
  if (!signatureHeader || !secret) {
    console.warn('⚠️ Faltan parámetros para verificación');
    return false;
  }

  try {
    // MercadoPago envía las firmas en formato "sha256=xxx,sha1=yyy"
    const signatures = signatureHeader.split(',')
      .reduce((acc, current) => {
        const [version, signature] = current.split('=');
        acc[version] = signature;
        return acc;
      }, {});

    const signature = signatures['sha256'] || signatures['v1'] || signatureHeader;

    // Preparar el payload para verificación
    let payload;
    if (typeof body === 'string') {
      payload = body;
    } else if (body instanceof Buffer) {
      payload = body.toString('utf8');
    } else {
      payload = JSON.stringify(body);
    }

    // Generar firma HMAC-SHA256
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Comparación segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};