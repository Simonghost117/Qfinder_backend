import mercadopago from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

export const createSubscriptionPlan = async (planData) => {
  try {
    const plan = await mercadopago.preapproval_plan.create(planData);
    return plan.response;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw new Error(error.message);
  }
};

export const createSubscription = async (subscriptionData) => {
  try {
    const subscription = await mercadopago.preapproval.create(subscriptionData);
    return subscription.response;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error(error.response ? error.response.body.message : error.message);
  }
};

export const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await mercadopago.preapproval.get(subscriptionId);
    return subscription.response;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw new Error(error.message);
  }
};

export const handleWebhook = async (payload, signature) => {
  try {
    if (signature !== process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      throw new Error('Invalid webhook signature');
    }

    const { type, data } = payload;
    
    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      return payment.body;
    } else if (type === 'subscription') {
      const subscription = await mercadopago.preapproval.get(data.id);
      return subscription.body;
    }
    
    return null;
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
};