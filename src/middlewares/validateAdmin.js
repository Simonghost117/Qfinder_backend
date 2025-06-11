export const validateAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            console.error('Error en validateAdmin: No se encontró información de usuario en la solicitud');
            return res.status(401).json({
                success: false,
                error: 'No autenticado: Información de usuario no disponible',
                code: 'UNAUTHENTICATED'
        });
    }
        const { tipo_usuario } = req.user; // Obtener el tipo de usuario del token

        // Verificar si el usuario es administrador
        if (tipo_usuario !== 'Administrador') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requieren privilegios de administrador'
            });
        }

        next();
    } catch (error) {
        console.error('Error en middleware validateAdmin:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar permisos de administrador'
        });
    }
    }

    
    export const validateRol = (allowedRoles = ['Administrador', 'Super']) => {
      return async (req, res, next) => {
        try {
          console.log('Iniciando verificación de permisos...'); 
          console.log('User:', req.user); 
          console.log('Params:', req.params); 
    
        
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
    
          if (userRole === 'Administrador') {
            console.log('Acceso concedido: Administrador');
            return next();
          }
          if (userRole === 'Super') {
            console.log('Acceso concedido: Super Administrador');
            return next();
          }

    
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

