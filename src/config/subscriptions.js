export const SUBSCRIPTION_LIMITS = {
  free: { pacientes: 2, cuidadores: 1 },
  plus: { pacientes: 5, cuidadores: 3 },
  pro: { pacientes: 15, cuidadores: 10 }
};

export const PLANS_MERCADOPAGO = {
  plus: {
    id: null,
    description: "Plan Plus - 5 pacientes y 3 colaboradores",
    amount: 20000, // $20,000 COP (mínimo de MercadoPago)
    currency_id: "COP" // Moneda colombiana
  },
  pro: {
    id: null,
    description: "Plan Pro - 15 pacientes y 10 colaboradores",
    amount: 50000, // $50,000 COP (ejemplo de plan superior)
    currency_id: "COP"
  }
};