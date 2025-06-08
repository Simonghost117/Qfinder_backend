import mercadopago from 'mercadopago';

export async function configureMercadoPago() {
  try {
    const { MercadoPagoConfig } = mercadopago;
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    // 1. Validar token
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token de MercadoPago inválido');
    }

    // 2. Configurar cliente
    const client = new MercadoPagoConfig({
      accessToken: mpToken,
      options: {
        integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined
      }
    });

    // 3. Verificar conexión
    const paymentMethods = new mercadopago.PaymentMethods(client);
    const methods = await paymentMethods.list();

    console.log("✅ MercadoPago configurado. Métodos disponibles:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Error MercadoPago:", {
      message: error.message,
      status: error.status || 500
    });
    return false;
  }
}