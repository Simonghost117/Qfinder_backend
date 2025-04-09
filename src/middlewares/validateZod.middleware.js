import { z } from 'zod';

/**
 * Middleware mejorado que mantiene compatibilidad con tus rutas existentes
 * @param {import('zod').ZodSchema} schema - Esquema Zod
 * @param {Object} options
 * @param {'body'|'query'|'params'} [options.source='body'] - Fuente de datos
 * @param {boolean} [options.replaceOriginal=true] - Si reemplaza el objeto original
 */
export const validateZodSchema = (schema, options = {}) => {
  const { source = 'body', replaceOriginal = true } = options;

  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validatedData = await schema.parseAsync(dataToValidate);

      // Opción para mantener compatibilidad
      if (replaceOriginal) {
        req[source] = validatedData; // Reemplazo tradicional
      } else {
        req.validatedData = validatedData; // Nuevo enfoque
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          errors
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Error interno al validar los datos'
      });
    }
  };
};