import crypto from 'crypto';
import fs from 'fs';

// 👉 Copia tu payload exactamente como llegó en el rawBody del webhook
const rawPayload = `{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":390857873}`;

// 👉 Pega aquí tu secreto (el mismo que configuraste en el panel de Webhooks de Mercado Pago)
const secret = '43ee53e803c161ebf5025835eb8a0d75940d80a18b71ecd3f04520b0aafad3e0';

// 👉 Firma que Mercado Pago te mandó en el header x-signature (extrae el valor después de `v1=`)
const firmaRecibida = 'a06c82730b3b19834344520d58bf6fd63a0f1790671a0b4861293c0185a51f71';

// 👉 Generamos la firma usando el cuerpo y el secreto
const generatedSignature = crypto
  .createHmac('sha256', secret)
  .update(rawPayload, 'utf8') // Usa UTF-8 explícitamente
  .digest('hex');

console.log('📦 Payload:', rawPayload);
console.log('🔐 Secreto usado:', secret);
console.log('🛠 Firma generada:', generatedSignature);
console.log('📨 Firma recibida:', firmaRecibida);

// 👉 Comparación segura
try {
  const isValid = crypto.timingSafeEqual(
    Buffer.from(firmaRecibida, 'hex'),
    Buffer.from(generatedSignature, 'hex')
  );
  console.log(isValid ? '✅ FIRMA VÁLIDA' : '❌ FIRMA INVÁLIDA');
} catch (error) {
  console.error('❌ Error al comparar firmas:', error.message);
}
