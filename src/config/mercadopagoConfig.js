import mercadopago from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

export async function configureMercadoPago() {
  try {
    mercadopago.configure({
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
    });
    
    // Verificación alternativa - obtener métodos de pago
    await mercadopago.payment_methods.list();
    console.log("✅ MercadoPago configurado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error configurando MercadoPago:", error.message);
    console.error("Detalles:", {
      tokenLength: process.env.MERCADOPAGO_ACCESS_TOKEN?.length,
      hasIntegrator: !!process.env.MERCADOPAGO_INTEGRATOR_ID
    });
    return false;
  }
}

export default mercadopago;