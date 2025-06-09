import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { configureMercadoPago } from '../config/mercadopago.js';

const client = configureMercadoPago();

export const createPreference = async (preferenceData) => {
  try {
    const preference = await new Preference(client).create({ body: preferenceData });
    console.log('Preference created:', JSON.stringify(preference, null, 2));
    return preference;
  } catch (error) {
    console.error('Error creating preference:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create preference: ${error.message}`);
  }
};

export const getPayment = async (paymentId) => {
  try {
    const payment = await new Payment(client).get({ id: paymentId });
    console.log('Payment details:', JSON.stringify(payment, null, 2));
    return payment;
  } catch (error) {
    console.error('Error getting payment:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to get payment: ${error.message}`);
  }
};