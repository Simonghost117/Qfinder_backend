import { Router } from 'express';
import { EpisodioSaludController } from '../controllers/episodioSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { uploadEpisodio } from '../middlewares/uploadEpisodios.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { episodioSchema, filtroSchema } from '../schema/episodioSalud.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { injectPacienteId } from '../middlewares/injectPacienteId.middleware.js';

const routerEpisodioSalud = Router();

// Wrapper para mantener el contexto `this` de los métodos estáticos
function wrap(method) {
  return (req, res, next) => method.call(EpisodioSaludController, req, res, next);
}

// Crear episodio
//El id_paciente no debe ser manualmente ingresado, sino que debe ser inyectado en el middleware
routerEpisodioSalud.post(
  '/episodioSalud/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Usuario']),//Medico tiene error de permisos
  uploadEpisodio,
  injectPacienteId,
  validateZodSchema(episodioSchema),
  wrap(EpisodioSaludController.crearEpisodio)
);

// Obtener todos los episodios de un paciente
//El usuario no puede ver los episodios
routerEpisodioSalud.get(
  '/episodioSalud/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente', 'Usuario']),//Medico tiene error de permisos
  //Paciente tiene permiso de visualizacion de los episodios?
  // validateZodSchema(filtroSchema, { source: 'query' }),
  wrap(EpisodioSaludController.obtenerEpisodiosPaciente)
);

// Obtener un episodio específico
routerEpisodioSalud.get(
  '/episodioSalud/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
  wrap(EpisodioSaludController.obtenerEpisodio)
);

// Actualizar episodio
routerEpisodioSalud.put(
  '/episodioSalud/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar']),
  uploadEpisodio,
  validateZodSchema(episodioSchema),
  wrap(EpisodioSaludController.actualizarEpisodio)
);

// Eliminar episodio
routerEpisodioSalud.delete(
  '/episodioSalud/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Medico', 'Familiar']),
  wrap(EpisodioSaludController.eliminarEpisodio)
);

export default routerEpisodioSalud;
