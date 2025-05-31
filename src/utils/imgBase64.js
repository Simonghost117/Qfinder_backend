import fs from 'fs';
import path from 'path';

export const imgBase64 = async (image, mimeType) => {
  try {
    let base64String;
    
    // Caso 1: Ya es una cadena Base64 (podría validar mejor esto)
    if (typeof image === 'string' && image.startsWith('data:image')) {
      return image;
    }
    
    // Caso 2: Es un Buffer
    if (Buffer.isBuffer(image)) {
      const mime = mimeType || 'image/jpeg'; // default jpeg si no se especifica
      base64String = `data:${mime};base64,${image.toString('base64')}`;
      return base64String;
    }
    
    // Caso 3: Es una ruta de archivo
    if (typeof image === 'string') {
      // Verificar si la ruta existe
      if (!fs.existsSync(image)) {
        throw new Error('La ruta de la imagen no existe');
      }
      
      // Leer el archivo
      const fileBuffer = fs.readFileSync(image);
      const ext = path.extname(image).toLowerCase().substring(1);
      const mime = mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      base64String = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      return base64String;
    }
    
    // Caso 4: Es un objeto File (como de multer)
    if (image && image.buffer) {
      const mime = mimeType || image.mimetype || 'image/jpeg';
      base64String = `data:${mime};base64,${image.buffer.toString('base64')}`;
      return base64String;
    }
    
    throw new Error('Formato de imagen no soportado');
  } catch (error) {
    console.error('Error al convertir imagen a Base64:', error);
    throw error; // Re-lanzar el error para manejo externo
  }
};

export const manejarImagenes = async (imagenRecibida, imagenActual) => {
  let nuevaImagen = imagenActual; // Mantener la imagen actual por defecto
  
  if (imagenRecibida && typeof imagenRecibida === "string") {
    const esBase64 = imagenRecibida.startsWith("data:image/");
    const esURL = imagenRecibida.startsWith("http://") || imagenRecibida.startsWith("https://");

    if (!esBase64 && !esURL) {
      try {
        nuevaImagen = await imgBase64(imagenRecibida); // Procesar archivo local
      } catch (error) {
        console.error("Error procesando imagen:", error);
        throw new Error("Error al procesar la imagen");
      }
    } else {
      nuevaImagen = imagenRecibida; // Mantener si es Base64 o URL
    }
  }

  return nuevaImagen;
};

