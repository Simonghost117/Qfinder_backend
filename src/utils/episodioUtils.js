export function prepararDatosCreacion(data) {
    return {
      ...data,
      fecha_hora_inicio: new Date(data.fecha_hora_inicio),
      sintomas: Array.isArray(data.sintomas) ? data.sintomas : [],
    };
  }
  