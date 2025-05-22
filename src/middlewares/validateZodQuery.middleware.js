export const validateZodQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated; //Esta linea me sirve para guardar los datos validados
      next();
    } catch (error) {
      console.error("Error en validateZodQuery:", error);
      return res.status(400).json({
        ok: false,
        error: "Parámetros de consulta inválidos",
        detalles: error.errors,
      });
    }
  };
};
