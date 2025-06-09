import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { configureMercadoPago } from '../config/mercadopago.js';

const client = configureMercadoPago();

export const createPreference = async (preferenceData) => {
  try {
    // Añade validación de datos críticos
    if (!preferenceData.items || preferenceData.items.length === 0) {
      throw new Error('Items array is empty');
    }
    
    if (preferenceData.items.some(item => !item.unit_price || item.unit_price <= 0)) {
      throw new Error('Invalid unit_price in items');
    }

    const preference = await new Preference(client).create({ body: preferenceData });
    console.log('Preference created:', JSON.stringify(preference, null, 2));
    
    // Validación de la respuesta
    if (!preference.sandbox_init_point) {
      throw new Error('Missing sandbox_init_point in response');
    }
    
    return preference;
  } catch (error) {
    console.error('Error creating preference:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create preference: ${error.message}`);
  }
};