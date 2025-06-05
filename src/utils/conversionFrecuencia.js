// utils/frequencyUtils.js
export const parseFrequency = (frequencyString) => {
  if (!frequencyString) throw new Error('La frecuencia es requerida');
  
  // Expresión regular para extraer número y unidad
  const regex = /^(\d+)\s*(horas|dias|semanas|meses)$/i;
  const match = frequencyString.trim().match(regex);
  
  if (!match) throw new Error('Formato de frecuencia inválido. Ejemplo: "3 horas", "2 dias"');
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  if (value <= 0) throw new Error('El valor debe ser positivo');
  
  // Conversión a horas
  const conversionRates = {
    horas: 1,
    dias: 24,
    semanas: 24 * 7,
    meses: 24 * 30 // Aproximación
  };
  
  return {
    original: frequencyString,
    value: value,
    unit: unit,
    inHours: value * conversionRates[unit]
  };
};