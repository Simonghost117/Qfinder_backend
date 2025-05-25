import { Router } from 'express';
import { EpisodioSaludController } from '../controllers/episodioSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { uploadEpisodio } from '../middlewares/uploadEpisodios.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { episodioSchema, filtroSchema } from '../schema/episodioSalud.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { injectPacienteId } from '../middlewares/injectPacienteId.middleware.js';
import { validateZodQuery } from "../middlewares/validateZodQuery.middleware.js";


const routerEpisodioSalud = Router();

// Wrapper para mantener el contexto `this` de los métodos estáticos
function wrap(method) {
  return (req, res, next) => method.call(EpisodioSaludController, req, res, next);
}

// Crear episodio
routerEpisodioSalud.post(
  '/episodioSalud/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Usuario']),//Medico tiene error de permisos
  uploadEpisodio,
  injectPacienteId,
  validateZodSchema(episodioSchema),
  wrap(EpisodioSaludController.crearEpisodio)
);

//Obtener episodios de acuerdo al filtro
routerEpisodioSalud.get(
  '/episodioSalud/:id_paciente/filtrar',
  verifyToken,
  checkEpisodioPermissions(['Familiar', 'Usuario']),
  validateZodQuery(filtroSchema, { source: 'query' }),
  wrap(EpisodioSaludController.filtrarEpisodios)
);

// Obtener todos los episodios de un paciente
routerEpisodioSalud.get(
  '/episodioSalud/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Administrador', 'Usuario']),//Medico tiene error de permisos
  //Paciente tiene permiso de visualizacion de los episodios?
  // validateZodSchema(filtroSchema, { source: 'query' }),
  wrap(EpisodioSaludController.obtenerEpisodiosPaciente)
);
// Obtener episodios de un paciente por id
routerEpisodioSalud.get(
  '/pacientes/:id_paciente/episodioSalud/:id_episodio', 
  verifyToken,
  checkEpisodioPermissions(['Usuario', 'Familiar', 'Paciente']),
  wrap(EpisodioSaludController.obtenerEpisodio)
);

// Actualizar episodio
routerEpisodioSalud.put(
  '/pacientes/:id_paciente/episodioSalud/:id_episodio', // <- ¡Nuevo parámetro!
  verifyToken,
  checkEpisodioPermissions(['Familiar', 'Usuario']),
  uploadEpisodio,
  validateZodSchema(episodioSchema), // Valida body
  wrap(EpisodioSaludController.actualizarEpisodio)
);
// Eliminar episodio
routerEpisodioSalud.delete(
  '/eliminarEpis/:id_paciente/:id_episodio',
  verifyToken,
  checkEpisodioPermissions(['Familiar','Usuario']),
  wrap(EpisodioSaludController.eliminarEpisodio)
);



export default routerEpisodioSalud;
