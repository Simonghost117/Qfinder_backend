import { mercadopago } from './config.js';

export const verifyWebhookSignature = (body, signature, secret) => {
  try {
    if (!signature || !body) {
      console.error('⚠️ Firma o cuerpo faltante');
      return false;
    }

    // Extraer componentes de la firma
    const [tsPart, v1Part] = signature.split(',');
    const ts = tsPart.split('=')[1];
    const receivedSignature = v1Part.split('=')[1];

    // Verificar la firma
    const generatedSignature = mercadopago.payment.validateWebhookSignature({
      'x-signature': signature,
      'x-request-id': body.id || 'default_id'
    }, body, secret);

    if (!generatedSignature) {
      console.error('⚠️ No se pudo generar firma de verificación');
      return false;
    }

    const isValid = receivedSignature === generatedSignature;
    
    if (!isValid) {
      console.error('⚠️ Firmas no coinciden', {
        received: receivedSignature,
        generated: generatedSignature,
        timestamp: ts,
        body: JSON.stringify(body)
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error en verifyWebhookSignature:', error);
    return false;
  }
};