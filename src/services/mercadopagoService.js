import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { configureMercadoPago } from '../config/mercadopagoConfig.js';

const client = configureMercadoPago();

export const createPreference = async (preferenceData) => {
  try {
    if (!preferenceData.items || preferenceData.items.length === 0) {
      throw new Error('El array de items no puede estar vacío');
    }
    
    const invalidItems = preferenceData.items.filter(
      item => !item.unit_price || item.unit_price <= 0
    );
    
    if (invalidItems.length > 0) {
      throw new Error(`Items con precios inválidos: ${JSON.stringify(invalidItems)}`);
    }

    // Configuración adicional recomendada
    const enhancedPreference = {
      ...preferenceData,
      binary_mode: true, // Evita pagos pendientes
      expires: false, // La preferencia no expira
      statement_descriptor: "QFINDER*SUBSCRIPTION",
      metadata: {
        ...preferenceData.metadata,
        platform: "nodejs",
        version: "1.0"
      }
    };

    const preference = await new Preference(client).create({ body: enhancedPreference });
    
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

    // Mapeo completo de campos importantes
    return {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      date_last_updated: payment.date_last_updated,
      payer: {
        id: payment.payer?.id,
        email: payment.payer?.email,
        identification: payment.payer?.identification
      },
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      external_reference: payment.external_reference,
      description: payment.description,
      metadata: payment.metadata,
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

export const searchPayments = async (filters = {}) => {
  try {
    const payment = new Payment(client);
    const searchResults = await payment.search({
      options: {
        filters: {
          ...filters,
          'range': 'date_created',
          'begin_date': 'NOW-1MONTH',
          'end_date': 'NOW'
        },
        pagination: {
          limit: 100,
          offset: 0
        }
      }
    });
    
    return searchResults.results.map(p => ({
      id: p.id,
      status: p.status,
      amount: p.transaction_amount,
      date_created: p.date_created,
      external_reference: p.external_reference
    }));
  } catch (error) {
    console.error('Error buscando pagos:', error);
    throw error;
  }
};