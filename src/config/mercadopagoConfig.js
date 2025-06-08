import mercadopago from 'mercadopago';

export async function configureMercadoPago() {
  try {
    // 1. Validación básica del token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token inválido o faltante');
    }

    // 2. Configuración
    mercadopago.configure({
      access_token: mpToken,
      integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
    });

    // 3. Prueba real de conexión (nueva forma correcta)
    const client = new mercadopago.MercadoPagoConfig({
      accessToken: mpToken
    });
    const paymentMethods = new mercadopago.PaymentMethods(client);
    const methods = await paymentMethods.list();

    if (!methods || !Array.isArray(methods)) {
      throw new Error('Respuesta inesperada de MercadoPago');
    }

    console.log("✅ MercadoPago configurado. Métodos disponibles:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Falla crítica en MercadoPago:", error.message);
    
    console.log("ℹ️ Debug info:", {
      sdkVersion: mercadopago.version,
      nodeVersion: process.version,
      tokenPresent: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      tokenLength: process.env.MERCADOPAGO_ACCESS_TOKEN?.length
    });

    return false;
  }
}