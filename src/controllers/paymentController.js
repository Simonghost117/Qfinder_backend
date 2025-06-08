import mercadopago from 'mercadopago';

const { MercadoPagoConfig, PaymentMethods } = mercadopago;

export async function configureMercadoPago() {
  try {
    // 1. Validar token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token inválido');
    }

    // 2. Configurar cliente
    const client = new MercadoPagoConfig({
      accessToken: mpToken,
      options: { 
        integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined 
      }
    });

    // 3. Probar conexión
    const paymentMethods = new PaymentMethods(client);
    const methods = await paymentMethods.list();
    
    console.log("✅ MercadoPago listo. Métodos:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Error MP:", {
      message: error.message,
      code: error.status || 500,
      stack: error.stack
    });
    return false;
  }
}