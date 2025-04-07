export default (rolEsperado) => {
    return (req, res, next) => {
      const usuario = req.user; 
  
      if (!usuario || usuario.tipo_usuario !== rolEsperado) {
        return res.status(403).json({ message: 'Acceso denegado: solo para médicos' });
      }
  
      next();
    };
  };
  