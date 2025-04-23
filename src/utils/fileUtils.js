import fs from 'fs';
import path from 'path';

export const createUploadsFolder = (folderPath) => {
  try {
    const absolutePath = path.resolve(folderPath);
    
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
      console.log(`📁 Directorio creado: ${absolutePath}`);
      return absolutePath;
    }
    
    return absolutePath;
  } catch (error) {
    console.error(`❌ Error creando directorio ${folderPath}:`, error);
    throw new Error(`No se pudo crear el directorio: ${error.message}`);
  }
};