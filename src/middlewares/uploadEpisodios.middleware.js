import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createUploadsFolder } from '../utils/fileUtils.js';  // Import correcto

const episodiosDir = 'uploads/episodios';

// 1. Usa el nombre correcto de la función
createUploadsFolder(episodiosDir);

// 2. Configuración de Multer mejorada
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Asegura que el directorio existe antes de guardar
    createUploadsFolder(episodiosDir);
    cb(null, episodiosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo ${file.mimetype} no permitido. Solo se aceptan: ${allowedTypes.join(', ')}`), false);
  }
};

export const uploadEpisodio = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 5  // Límite de archivos
  }
}).single('archivo');


// 3. Middleware de manejo de errores
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo es demasiado grande (máx. 25MB)' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
};