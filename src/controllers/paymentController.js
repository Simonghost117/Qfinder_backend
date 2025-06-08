import mercadopago from 'mercadopago';

const { MercadoPagoConfig, PaymentMethods } = mercadopago;

export async function configureMercadoPago() {
  try {
    // 1. Validar token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.length < 30) {
      throw new Error('Token inválido');
    }

    // 2. Configurar cliente
    const client = new MercadoPagoConfig({
      accessToken: mpToken,
      options: { 
        integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined 
      }
    });

    // 3. Probar conexión
    const paymentMethods = new PaymentMethods(client);
    const methods = await paymentMethods.list();
    
    console.log("✅ MercadoPago listo. Métodos:", methods.length);
    return true;

  } catch (error) {
    console.error("❌ Error MP:", {
      message: error.message,
      code: error.status || 500,
      stack: error.stack
    });
    return false;
  }
}
export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const subscription = await Subscription.findOne({
      where: { 
        usuario_id: userId,
        estado_suscripcion: ['active', 'pending'] 
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No hay suscripción activa o pendiente' });
    }

    await mercadopago.preapproval.update({
      id: subscription.mercado_pago_id,
      status: 'cancelled'
    });

    await subscription.update({
      estado_suscripcion: 'cancelled',
      fecha_cancelacion: new Date()
    });

    await Usuario.update(
      { membresia: 'free' },
      { where: { id_usuario: userId } }
    );

    res.json({ 
      message: 'Suscripción cancelada',
      cancellation_date: new Date()
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    
    let errorMessage = 'Error interno del servidor';
    if (error.response && error.response.body) {
      errorMessage = error.response.body.message || JSON.stringify(error.response.body);
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message
    });
  }
};