import { MercadoPagoConfig } from 'mercadopago';
const tokent = "TEST-358197303018633-060512-ccf1663185081e779360ba7d539ce364-390857873"
export const configureMercadoPago = () => {
  const accessToken = tokent || process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está definido');
  }

  return new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
      timeout: 15000,
      idempotencyKey: `mp-${Date.now()}`,
      integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID
    }
  });
};