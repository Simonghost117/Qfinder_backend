import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const verifyToken = async (req, res, next) => {
    const { token } = req.cookies;
  
    if (!token) {
      return res.status(401).json({ error: 'No se proporcionó un token' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded; // Adjuntar datos del token a req.usuario
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };