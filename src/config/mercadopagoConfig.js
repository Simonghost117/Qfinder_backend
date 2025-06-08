import mercadopago from 'mercadopago';

export async function configureMercadoPago() {
  try {
    // 1. Validación del token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token de MercadoPago inválido');
    }

    // 2. Configuración del SDK (versión actual)
    mercadopago.configure({
      access_token: mpToken,
      integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
    });

    // 3. Prueba de conexión alternativa
    const response = await mercadopago.payment_methods.list()
      .catch(err => { throw new Error(`API no respondió: ${err.message}`) });

    if (!response || !response.body) {
      throw new Error('Respuesta inválida de MercadoPago');
    }

    console.log("✅ MercadoPago configurado correctamente");
    return true;

  } catch (error) {
    console.error("❌ Error en MercadoPago:", {
      message: error.message,
      status: error.status || 500,
      stack: error.stack
    });
    return false;
  }
}