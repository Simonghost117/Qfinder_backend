import { handleError } from '../utils/errorHandler.js';

import { models } from "../models/index.js";
const { Familiar, Colaborador, Paciente } = models;


export const checkEpisodioPermissions = (allowedRoles = ['Usuario', 'Familiar', 'Administrador', 'Colaborador']) => {
  return async (req, res, next) => {
    try {
      console.log('Iniciando verificación de permisos...'); // Debug
      console.log('User:', req.user); // Debug: Verificar usuario autenticado
      console.log('Params:', req.params); // Debug: Verificar parámetros

      // 1. Validación de parámetros
      if (!req?.params?.id_paciente) {
        console.error('Falta ID de paciente en los parámetros');
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de paciente en los parámetros',
          code: 'MISSING_PATIENT_ID',
          details: {
            received_params: req.params,
            required_param: 'id_paciente'
          }
        });
      }

      const { id_paciente } = req.params;
      const userId = req.user?.id_usuario;
      const userRole = req.user?.tipo_usuario;

      // 2. Validación de autenticación
      if (!userId || !userRole) {
        console.error('Usuario no autenticado o información incompleta:', { userId, userRole });
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'UNAUTHORIZED',
          details: {
            user_info: req.user,
            missing_fields: [!userId ? 'id_usuario' : null, !userRole ? 'tipo_usuario' : null].filter(Boolean)
          }
        });
      }

      // 3. Validación de roles permitidos
      if (!allowedRoles.includes(userRole)) {
        console.error('Rol no permitido:', { userRole, allowedRoles });
        return res.status(403).json({
          success: false,
          message: `Rol no autorizado. Su rol: ${userRole}`,
          code: 'FORBIDDEN_ROLE',
          details: {
            allowed_roles: allowedRoles,
            current_role: userRole,
            action_required: 'Contacte al administrador si necesita acceso'
          }
        });
      }

      // 4. Verificar existencia del paciente
      const paciente = await Paciente.findByPk(id_paciente);
      if (!paciente) {
        console.error('Paciente no encontrado:', id_paciente);
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
          code: 'PATIENT_NOT_FOUND',
          details: {
            patient_id: id_paciente,
            action_required: 'Verifique el ID del paciente'
          }
        });
      }

      console.log('Paciente encontrado:', paciente.id_paciente); // Debug

      // 5. Lógica de permisos por rol
      if (userRole === 'Administrador') {
        console.log('Acceso concedido: Administrador');
        return next();
      }

      // Verificar relación para Usuario/Familiar
      const [esDueño, esFamiliar, esColaborador] = await Promise.all([
        Paciente.findOne({ 
          where: { 
            id_paciente, 
            id_usuario: userId 
          } 
        }),
        Familiar.findOne({ 
          where: { 
            id_paciente, 
            id_usuario: userId 
          },
          attributes: ['id_familiar', 'parentesco', 'cuidador_principal']
        }),
        Colaborador.findOne({
         where: { 
          id_paciente, 
          id_usuario: userId }
  })
      ]);

      console.log('Resultados verificación:', { esDueño: !!esDueño, esFamiliar: !!esFamiliar }); // Debug

      if (!esDueño && !esFamiliar && !esColaborador) {
        console.error('Sin relación con el paciente:', { userId, id_paciente });
        return res.status(403).json({
          success: false,
          message: 'No tienes relación con este paciente',
          code: 'NO_RELATIONSHIP',
          details: {
            user_id: userId,
            patient_id: id_paciente,
            is_owner: false,
            is_family: false,
            action_required: 'Debes ser el creador del paciente o estar registrado como familiar'
          }
        });
      }

      // Adjuntar información al request para middlewares/rutas posteriores
      req.pacienteRelation = {
        isOwner: !!esDueño,
        isFamily: !!esFamiliar,
        familyData: esFamiliar ? esFamiliar.get({ plain: true }) : null,
        userRole: userRole
      };

      console.log('Permisos verificados con éxito:', req.pacienteRelation); // Debug
      next();

    } catch (error) {
      console.error('Error en checkEpisodioPermissions:', {
        error: error.message,
        stack: error.stack,
        request: {
          user: req.user,
          params: req.params,
          body: req.body
        }
      });
      handleError(res, error);
    }
  };
};

export const validatePermissions = (allowedRoles = ['responsable', 'colaborador']) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id_usuario;
      const pacienteId = req.body?.id_paciente || req.params?.id_paciente || req.query?.id_paciente;

      if (!userId || !pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos necesarios para la verificación de permisos'
        });
      }

      const esResponsable = await Familiar.findOne({
        where: {
          id_usuario: userId,
          id_paciente: pacienteId,
          // parentesco: 'tutor', // Asumiendo que 'tutor' es el rol de responsable
          // cuidador_principal: true // Asumiendo que esto identifica al responsable principal
        }
      });

      if (esResponsable && allowedRoles.includes('responsable')) {
        return next(); // Tiene permiso como responsable
      }

      // Verificar si el usuario es colaborador del paciente
      const esColaborador = await Colaborador.findOne({
        where: {
          id_usuario: userId,
          id_paciente: pacienteId
        }
      });

      if (esColaborador && allowedRoles.includes('colaborador')) {
        return next(); // Tiene permiso como colaborador
      }

      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a la información de este paciente'
      });

    } catch (error) {
      console.error('Error en validatePermissions:', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Error al verificar permisos'
      });
    }
  };
};