export const SUBSCRIPTION_LIMITS = {
  free: { pacientes: 2, cuidadores: 1 },
  plus: { pacientes: 5, cuidadores: 3 },
  pro: { pacientes: 15, cuidadores: 10 }
};

export const PLANS_MERCADOPAGO = {
  plus: {
    id: null, // Se asignará al crear el plan
    description: "Plan Plus - 5 pacientes",
    amount: 9.99
  },
  pro: {
    id: null, // Se asignará al crear el plan
    description: "Plan Pro - 15 pacientes",
    amount: 19.99
  }
};