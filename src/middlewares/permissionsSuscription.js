// export const requirePlusOrPro = () => {
//   return async (req, res, next) => {
//     try {
//       // 1. Verificar autenticación
//       if (!req.user?.id_usuario) {
//         return res.status(401).json({
//           success: false,
//           message: 'Autenticación requerida',
//           code: 'UNAUTHORIZED'
//         });
//       }

//       // 2. Obtener membresía del usuario
//       const userMembership = req.user?.membresia?.toLowerCase(); // Normalizar a minúsculas
//       console.log(`Membresía del usuario: ${userMembership}`);
//       console.log(`ID de usuario: ${req.user.id_usuario}`);

//       // 3. Validar membresía permitida (plus o pro)
//       const allowedMemberships = ['plus', 'pro'];
      
//       if (!allowedMemberships.includes(userMembership)) {
//         return res.status(403).json({
//           success: false,
//           message: 'Se requiere membresía Plus o Pro',
//           code: 'MEMBERSHIP_REQUIRED',
//           details: {
//             current_membership: userMembership || 'none',
//             allowed_memberships: allowedMemberships,
//             upgrade_url: '/subscription/upgrade' // Ruta para actualizar membresía
//           }
//         });
//       }

//       // 4. Adjuntar información de membresía al request
//       req.membershipInfo = {
//         level: userMembership,
//         isPro: userMembership === 'pro'
//       };

//       next();
//     } catch (error) {
//       console.error('Error en requirePlusOrPro:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Error al verificar membresía',
//         code: 'MEMBERSHIP_CHECK_ERROR'
//       });
//     }
//   };
// };
export const verifyAccess = (options = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Verificar autenticación básica
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'No autenticado',
          code: 'UNAUTHORIZED'
        });
      }

      // 2. Validar que el usuario tenga membresía definida
      if (typeof req.user.membresia === 'undefined') {
        return res.status(403).json({
          success: false,
          message: 'Información de membresía no disponible',
          code: 'MISSING_MEMBERSHIP_DATA'
        });
      }

      // 3. Preparar información de acceso
      req.accessInfo = {
        role: req.user.tipo_usuario,
        membership: req.user.membresia.toLowerCase(), // Normalizar a minúsculas
        userId: req.user.id_usuario,
        isAdmin: req.user.tipo_usuario === 'Administrador'
      };

      // 4. Si es administrador, permitir acceso completo
      if (req.accessInfo.isAdmin) {
        return next();
      }

      // 5. Validación de roles permitidos (si se especificaron)
      if (options.allowedRoles && !options.allowedRoles.includes(req.user.tipo_usuario)) {
        return res.status(403).json({ 
          success: false,
          message: 'Rol no autorizado',
          code: 'FORBIDDEN_ROLE',
          allowedRoles: options.allowedRoles
        });
      }

      // 6. Validación de membresía (bloquear free si se especifica)
      if (options.blockFree && req.accessInfo.membership === 'free') {
        return res.status(403).json({
          success: false,
          message: 'Tu plan Free no tiene acceso a esta función',
          code: 'INSUFFICIENT_MEMBERSHIP',
          requiredMembership: 'plus o pro',
          upgradeUrl: '/subscription/upgrade'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};