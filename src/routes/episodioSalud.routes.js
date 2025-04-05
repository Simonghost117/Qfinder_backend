import { Router } from 'express';
import { EpisodioSaludController } from '../controllers/episodioSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { uploadEpisodio } from '../middlewares/uploadEpisodios.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { episodioSchema, filtroSchema } from '../validators/episodioSalud.validator.js';

const router = Router();

router.post(
  '/pacientes/:id_paciente/episodios',
  checkEpisodioPermissions(['Medico', 'Familiar']),
  uploadEpisodio,
  validateZodSchema(episodioSchema),
  EpisodioSaludController.crearEpisodio
);

router.get(
  '/pacientes/:id_paciente/episodios',
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
  validateZodSchema(filtroSchema, { source: 'query' }),
  EpisodioSaludController.obtenerEpisodiosPaciente
);

router.get(
  '/episodios/:id_episodio',
  checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
  EpisodioSaludController.obtenerEpisodio
);

router.put(
  '/episodios/:id_episodio',
  checkEpisodioPermissions(['Medico', 'Familiar']),
  uploadEpisodio,
  validateZodSchema(episodioSchema.partial()),
  EpisodioSaludController.actualizarEpisodio
);

router.delete(
  '/episodios/:id_episodio',
  checkEpisodioPermissions(['Medico', 'Familiar']),
  EpisodioSaludController.eliminarEpisodio
);

export default router;

// import { Router } from 'express';
// import { EpisodioSaludController } from '../controllers/episodioSalud.controller.js';
// //import { authRequired } from '../middlewares/auth.middleware.js';
// import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
// //import { validate } from '../middlewares/validator.middleware.js';
// import { episodioSchema, filtroSchema } from '../validators/episodioSalud.validator.js';
// import { uploadEpisodio } from '../middlewares/uploadEpisodios.middleware.js';

// const router = Router();

// router.post('/pacientes/:id_paciente',
//   //authRequired,
//   checkEpisodioPermissions(['Medico', 'Familiar']),
//   uploadEpisodio,
//   //validate(episodioSchema),
//    EpisodioSaludController.crearEpisodio
// );

// router.get('/paciente/:id_paciente',
//   //authRequired,
//   checkEpisodioPermissions(['Medico', 'Familiar', 'Paciente']),
//   EpisodioSaludController.obtenerEpisodiosPaciente
// );

// // router.get('/filtrar/:id_episodio',
// //  // authRequired,
// //   //validate(filtroSchema, 'query'),
// //   EpisodioSaludController.obtenerEpisodio
// // );

// export default router;