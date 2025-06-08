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

    // 3. Prueba real de conexión (versión segura)
    const response = await mercadopago.payment_methods.list()
      .catch(err => { throw new Error(`API MP no respondió: ${err.message}`) });

    if (!Array.isArray(response?.body)) {
      throw new Error('Respuesta inesperada de MercadoPago');
    }

    console.log("✅ MercadoPago configurado. Métodos disponibles:", 
      response.body.length);
    return true;

  } catch (error) {
    console.error("❌ Falla crítica en MercadoPago:", error.message);
    
    // Debug avanzado para Railway
    console.log("ℹ️ Variables detectadas:", {
      tokenPresent: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      tokenLength: process.env.MERCADOPAGO_ACCESS_TOKEN?.length,
      nodeEnv: process.env.NODE_ENV,
      railway: !!process.env.RAILWAY_ENVIRONMENT
    });

    return false;
  }
}