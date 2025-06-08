// src/config/mercadopagoConfig.js
import mercadopago from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

export function configureMercadoPago() {
  try {
    mercadopago.configure({
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID
    });
    console.log("✅ MercadoPago configurado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error configurando MercadoPago:", error);
    return false;
  }
}

export default mercadopago;