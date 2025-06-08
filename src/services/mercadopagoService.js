import { MercadoPagoConfig, Preference } from 'mercadopago';
import { configureMercadoPago } from '../config/mercadopago.js';

const client = configureMercadoPago();
const preferenceClient = new Preference(client);

export const createPreference = async (preferenceData) => {
  try {
    const preference = await preferenceClient.create({ body: preferenceData });
    return preference;
  } catch (error) {
    console.error('Error creating preference:', error);
    throw error;
  }
};

export const getPayment = async (paymentId) => {
  try {
    const payment = await mercadopago.payment.get(paymentId);
    return payment.response;
  } catch (error) {
    console.error('Error getting payment:', error);
    throw error;
  }
};