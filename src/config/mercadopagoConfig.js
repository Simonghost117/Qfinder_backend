import { MercadoPagoConfig, PaymentMethods } from 'mercadopago';

export async function configureMercadoPago() {
  try {
    // 1. Validación del token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token de MercadoPago inválido');
    }

    // 2. Configuración del cliente
    const client = new MercadoPagoConfig({
      accessToken: mpToken,
      options: {
        integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined
      }
    });

    // 3. Prueba de conexión
    const paymentMethods = new PaymentMethods(client);
    const methods = await paymentMethods.list();
    
    if (!methods || !Array.isArray(methods)) {
      throw new Error('Respuesta inválida de MercadoPago');
    }

    console.log("✅ MercadoPago configurado correctamente. Métodos disponibles:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Error en MercadoPago:", {
      message: error.message,
      code: error.status || 500,
      details: error.cause || null
    });
    return false;
  }
}