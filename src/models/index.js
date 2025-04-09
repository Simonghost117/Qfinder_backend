import  {sequelize}  from '../config/database.js';

import { Usuario } from './Usuario.js';
import { Paciente } from './Paciente.js';
import { Medico } from './Medico.js';
import { Familiar } from './Familiar.js';
// import { PanelPersonalizado } from './PanelPersonalizado.js';
// import { Medicamento } from './Medicamento.js';
// import { PacienteMedicamento } from './PacienteMedicamento.js';
// import { ActividadCuidado } from './ActividadCuidado.js';
// import { CitaMedica } from './CitaMedica.js';
// import { MonitoreoSintomas } from './MonitoreoSintomas.js';
// import { ActividadFisica } from './ActividadFisica.js';
// import { CuidadoPersonal } from './CuidadoPersonal.js';
import { EpisodioSalud } from './EpisodioSalud.js';
// import { AlertaEmergencia } from './AlertaEmergencia.js';
// import { ReclamacionMedicamento } from './ReclamacionMedicamento.js';

// Relaciones Usuario
Usuario.hasOne(Paciente, { foreignKey: 'id_usuario' });
Usuario.hasOne(Medico, { foreignKey: 'id_usuario' });
Usuario.hasMany(Familiar, { foreignKey: 'id_usuario' });

// Relaciones Paciente
Paciente.belongsTo(Usuario, { foreignKey: 'id_usuario' });
Paciente.hasMany(Familiar, { foreignKey: 'id_paciente' });
// Paciente.hasMany(PanelPersonalizado, { foreignKey: 'id_paciente' });
// Paciente.hasMany(PacienteMedicamento, { foreignKey: 'id_paciente' });
// Paciente.hasMany(ActividadCuidado, { foreignKey: 'id_paciente' });
// Paciente.hasMany(CitaMedica, { foreignKey: 'id_paciente' });
// Paciente.hasMany(MonitoreoSintomas, { foreignKey: 'id_paciente' });
// Paciente.hasMany(ActividadFisica, { foreignKey: 'id_paciente' });
// Paciente.hasMany(CuidadoPersonal, { foreignKey: 'id_paciente' });
Paciente.hasMany(EpisodioSalud, { foreignKey: 'id_paciente' });
// Paciente.hasMany(AlertaEmergencia, { foreignKey: 'id_paciente' });
// Paciente.hasMany(ReclamacionMedicamento, { foreignKey: 'id_paciente' });

// Relaciones Familiar
Familiar.belongsTo(Usuario, { foreignKey: 'id_usuario' });
Familiar.belongsTo(Paciente, { foreignKey: 'id_paciente' });
// src/models/index.js (donde defines las relaciones) ESTE CODIGO ES RECIENTE DE ALEJANDRO HASTA EL #43
Usuario.belongsToMany(Red, { through: UsuarioRed, foreignKey: 'usuarioId' });
Red.belongsToMany(Usuario, { through: UsuarioRed, foreignKey: 'redId' });

// Relaciones Medico
Medico.belongsTo(Usuario, { foreignKey: 'id_usuario' });
// Medico.hasMany(CitaMedica, { foreignKey: 'id_medico' });

// Relaciones Medicamento
// Medicamento.hasMany(PacienteMedicamento, { foreignKey: 'id_medicamento' });
// Medicamento.hasMany(ReclamacionMedicamento, { foreignKey: 'id_medicamento' });

// Relaciones PacienteMedicamento
// PacienteMedicamento.belongsTo(Paciente, { foreignKey: 'id_paciente' });
// PacienteMedicamento.belongsTo(Medicamento, { foreignKey: 'id_medicamento' });

// Exportar todos los modelos
export {
  Usuario,
  Paciente,
  Medico,
  Familiar,
//   PanelPersonalizado,
//   Medicamento,
//   PacienteMedicamento,
//   ActividadCuidado,
//   CitaMedica,
//   MonitoreoSintomas,
//   ActividadFisica,
//   CuidadoPersonal,
EpisodioSalud,
//   AlertaEmergencia,
//   ReclamacionMedicamento
};

// Sincronizar modelos con la base de datos
export async function syncModels() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados correctamente');
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
  }
}