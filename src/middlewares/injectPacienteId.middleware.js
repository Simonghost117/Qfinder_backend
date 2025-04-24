export function injectPacienteId(req, res, next) {
    const { id_paciente } = req.params;
    if (id_paciente) {
      req.body.id_paciente = parseInt(id_paciente);
    }
    next();
  }
  