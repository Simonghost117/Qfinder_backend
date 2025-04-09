import  Usuario  from '../models/usuario.model.js';
import Paciente from '../models/paciente.model.js';
import {Familiar} from '../models/Familiar.js';
import {Medico} from '../models/Medico.js';

import { handleError } from '../utils/errorHandler.js';

export const checkEpisodioPermissions = (allowedRoles = ['Familiar', 'Medico', 'Administrador']) => {
  return async (req, res, next) => {
    try {
      // 1. Validación básica del request
      if (!req?.params?.id_paciente) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de paciente en la ruta (/pacientes/:id_paciente)'
        });
      }

      const { id_paciente } = req.params;
      const userId = req.user?.id_usuario;
      const userRole = req.user?.tipo_usuario;

      // 2. Verificación de autenticación
      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: 'Debe estar autenticado para realizar esta acción'
        });
      }

      // 3. Verificación de roles permitidos
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Su rol (${userRole}) no tiene permisos para esta acción. Roles permitidos: ${allowedRoles.join(', ')}`
        });
      }

      // 4. Lógica específica por rol
      switch (userRole) {
        case 'Administrador':
          next();
          break;

        case 'Medico':
          const medicoAsignado = await Medico.findOne({
            where: { id_usuario: userId },
            include: [{
              model: Usuario,
              include: [{
                model: Paciente,
                where: { id_paciente }
              }]
            }]
          });

          if (!medicoAsignado) {
            return res.status(403).json({
              success: false,
              message: 'No está autorizado como médico de este paciente'
            });
          }
          next();
          break;

        case 'Familiar':
          const familiarAutorizado = await Familiar.findOne({
            where: {
              id_usuario: userId,
              id_paciente
            }
          });

          if (!familiarAutorizado) {
            return res.status(403).json({
              success: false,
              message: 'No está registrado como familiar/cuidador de este paciente'
            });
          }
          next();
          break;

        default:
          return res.status(403).json({
            success: false,
            message: 'Rol no reconocido'
          });
      }
    } catch (error) {
      handleError(res, error);
    }
  };
};