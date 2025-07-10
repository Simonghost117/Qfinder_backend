export const SUBSCRIPTION_LIMITS = {
  free: { pacientes: 2, cuidadores: 0 },
  plus: { pacientes: 5, cuidadores: 5 },
  pro: { pacientes: 1000, cuidadores: 1000 }
};

export const PLANS_MERCADOPAGO = {
  plus: {
    description: "Plan Plus - 5 pacientes y 5 colaboradores",
    amount: 10000, // $10,000 COP
    currency_id: "COP",
    frequency: 1, // mensual
    frequency_type: "months"
  },
  pro: {
    description: "Plan Pro - 15 pacientes y 10 colaboradores",
    amount: 30000, // $10,000 COP
    currency_id: "COP",
    frequency: 1, // mensual
    frequency_type: "months"
  }
};