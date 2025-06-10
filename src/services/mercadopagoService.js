import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { configureMercadoPago } from '../config/mercadopago.js';

const client = configureMercadoPago();

export const createPreference = async (preferenceData) => {
  try {
    // Validación de datos
    if (!preferenceData.items || preferenceData.items.length === 0) {
      throw new Error('El array de items no puede estar vacío');
    }
    
    const invalidItems = preferenceData.items.filter(
      item => !item.unit_price || item.unit_price <= 0
    );
    
    if (invalidItems.length > 0) {
      throw new Error(`Items con precios inválidos: ${JSON.stringify(invalidItems)}`);
    }

    const preference = await new Preference(client).create({ body: preferenceData });
    
    if (!preference.id) {
      throw new Error('La respuesta de MercadoPago no incluyó un ID de preferencia');
    }

    return {
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      created: true,
      raw_response: preference
    };
  } catch (error) {
    console.error('Error al crear preferencia:', {
      error: error.message,
      stack: error.stack,
      requestData: preferenceData
    });
    throw new Error(`Error al crear preferencia: ${error.message}`);
  }
};

export const getPayment = async (paymentId) => {
  try {
    if (!paymentId) {
      throw new Error('Se requiere un paymentId válido');
    }

    const payment = await new Payment(client).get({ id: paymentId });
    
    if (!payment || !payment.id) {
      throw new Error('Pago no encontrado en MercadoPago');
    }

    return {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      payer: payment.payer,
      payment_method: payment.payment_method_id,
      external_reference: payment.external_reference,
      raw_response: payment
    };
  } catch (error) {
    console.error('Error al obtener pago:', {
      error: error.message,
      stack: error.stack,
      paymentId
    });
    throw new Error(`Error al obtener pago: ${error.message}`);
  }
};

export const searchPayments = async (filters) => {
  try {
    const payment = new Payment(client);
    const searchResults = await payment.search({ filters });
    return searchResults;
  } catch (error) {
    console.error('Error buscando pagos:', error);
    throw error;
  }
};