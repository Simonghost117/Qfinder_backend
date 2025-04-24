import Paciente from '../models/paciente.model.js';
import { Familiar } from '../models/Familiar.js';
import { handleError } from '../utils/errorHandler.js';

export const checkEpisodioPermissions = (allowedRoles = ['Usuario', 'Medico', 'Administrador']) => {
  return async (req, res, next) => {
    try {
      // Validación básica de parámetros
      if (!req?.params?.id_paciente) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de paciente en los parámetros',
          code: 'MISSING_PATIENT_ID'
        });
      }

      const { id_paciente } = req.params;
      const userId = req.user?.id_usuario;
      const userRole = req.user?.tipo_usuario;
      
      // Validación de autenticación
      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'UNAUTHORIZED'
        });
      }

      // Validación de roles permitidos
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Rol no autorizado. Roles permitidos: ${allowedRoles.join(', ')}`,
          code: 'FORBIDDEN_ROLE',
          allowedRoles,
          currentRole: userRole
        });
      }

      // Verificar existencia del paciente
      const paciente = await Paciente.findByPk(id_paciente);
      if (!paciente) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado',
          code: 'PATIENT_NOT_FOUND'
        });
      }

      // Lógica de permisos por rol
      switch (userRole) {
        case 'Administrador':
          // Los administradores tienen acceso completo
          next();
          break;

        case 'Medico':
          // Verificar si el médico está asignado al paciente
          const esMedicoAsignado = await this._verificarMedicoAsignado(userId, id_paciente);
          if (!esMedicoAsignado) {
            return res.status(403).json({
              success: false,
              message: 'No estás asignado como médico de este paciente',
              code: 'NOT_ASSIGNED_DOCTOR'
            });
          }
          next();
          break;

        case 'Usuario':
          // Verificar relación con el paciente
          const [esDueño, esFamiliar] = await Promise.all([
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
            })
          ]);
          
          if (!esDueño && !esFamiliar) {
            return res.status(403).json({
              success: false,
              message: 'No tienes relación con este paciente',
              code: 'NO_RELATIONSHIP',
              details: {
                es_dueño: false,
                es_familiar: false,
                action_required: 'Debes ser el creador del paciente o estar registrado como familiar'
              }
            });
          }

          // Adjuntar información de familiaridad al request
          req.pacienteRelation = {
            isOwner: !!esDueño,
            isFamily: !!esFamiliar,
            familyData: esFamiliar ? esFamiliar.get({ plain: true }) : null
          };
          
          next();
          break;

        default:
          return res.status(403).json({
            success: false,
            message: 'Rol no reconocido en el sistema',
            code: 'UNKNOWN_ROLE'
          });
      }
    } catch (error) {
      console.error('Error en checkEpisodioPermissions:', error);
      handleError(res, error);
    }
  };
};

// Método auxiliar para verificar médicos asignados
checkEpisodioPermissions._verificarMedicoAsignado = async (idMedico, idPaciente) => {
  try {
    // Implementar lógica para verificar si el médico está asignado al paciente
    // Esto podría requerir una tabla de relación médico-paciente
    // Ejemplo simplificado:
    const count = await someModel.count({
      where: {
        id_medico: idMedico,
        id_paciente: idPaciente
      }
    });
    return count > 0;
  } catch (error) {
    console.error('Error al verificar médico asignado:', error);
    return false;
  }
};