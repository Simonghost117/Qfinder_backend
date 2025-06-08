import { MercadoPagoConfig, PaymentMethods } from 'mercadopago';

// 1. Configuración inicial
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID }
});

// 2. Crear instancia de servicios
const paymentMethods = new PaymentMethods(client);

export async function configureMercadoPago() {
  try {
    // 3. Verificar conexión
    const methods = await paymentMethods.list();
    console.log("✅ MercadoPago configurado. Métodos:", methods.length);
    return true;
  } catch (error) {
    console.error("❌ Error MP:", {
      message: error.message,
      code: error.status || 500
    });
    return false;
  }
}