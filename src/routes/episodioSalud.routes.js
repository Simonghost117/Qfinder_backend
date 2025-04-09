import { Router } from 'express';
import { EpisodioSaludController } from '../controllers/episodioSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { uploadEpisodio } from '../middlewares/uploadEpisodios.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { episodioSchema, filtroSchema } from '../validators/episodioSalud.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = Router();

// Wrapper para mantener el contexto `this` de los métodos estáticos
function wrap(method) {
  return (req, res, next) => method.call(EpisodioSaludController, req, res, next);
}

// Crear episodio
router.post(
  '/pacientes/:id_paciente/episodios',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar']),
  uploadEpisodio,
  validateZodSchema(episodioSchema),
  wrap(EpisodioSaludController.crearEpisodio)
);

// Obtener todos los episodios de un paciente
router.get(
  '/pacientes/:id_paciente/episodios',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
  validateZodSchema(filtroSchema, { source: 'query' }),
  wrap(EpisodioSaludController.obtenerEpisodiosPaciente)
);

// Obtener un episodio específico
router.get(
  '/episodios/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
  wrap(EpisodioSaludController.obtenerEpisodio)
);

// Actualizar episodio
router.put(
  '/episodios/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar']),
  uploadEpisodio,
  validateZodSchema(episodioSchema.partial()),
  wrap(EpisodioSaludController.actualizarEpisodio)
);

// Eliminar episodio
router.delete(
  '/episodios/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar']),
  wrap(EpisodioSaludController.eliminarEpisodio)
);

export default router;
