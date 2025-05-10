export const validateSchema = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message
      }));
      return res.status(400).json({ errores: errors });
    }
    req.body = result.data; // Sanitiza y pasa los datos validados
    next();
  };
  