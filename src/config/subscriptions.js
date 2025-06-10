export const SUBSCRIPTION_LIMITS = {
  free: { pacientes: 2, cuidadores: 1 },
  plus: { pacientes: 5, cuidadores: 3 },
  pro: { pacientes: 15, cuidadores: 10 }
};

export const PLANS_MERCADOPAGO = {
  plus: {
    description: "Plan Plus - 5 pacientes y 3 colaboradores",
    amount: 2000, // $10,000 COP
    currency_id: "COP",
    frequency: 1, // mensual
    frequency_type: "months"
  },
  pro: {
    description: "Plan Pro - 15 pacientes y 10 colaboradores",
    amount: 5000, // $10,000 COP
    currency_id: "COP",
    frequency: 1, // mensual
    frequency_type: "months"
  }
};