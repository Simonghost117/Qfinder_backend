import sequelize from '../config/db.js';
import Usuario from './usuario.model.js';
import Paciente from './paciente.model.js';
import Familiar from './Familiar.js';
import Medico from './Medico.js';
import UsuarioRed from './Red.js';
import PanelPersonalizado from './panel_personalizado.js';
import CitaMedica from './cita_medica.js';
import { ActividadCuidado } from './activity.model.js';

// Definir relaciones entre los modelos
Paciente.hasMany(Familiar, { foreignKey: 'id_paciente', as: 'familiares' });
Familiar.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Usuario.hasMany(Paciente, { foreignKey: 'id_usuario' });
Paciente.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Medico.belongsTo(Usuario, { foreignKey: "id_usuario" });
Usuario.hasOne(Medico, { foreignKey: "id_usuario" });

// Después de definir todos los modelos
UsuarioRed.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id_usuario', as: 'usuario' });
  
Usuario.hasMany(UsuarioRed, { foreignKey: 'id_usuario', as: 'redes' });

Usuario.hasMany(PanelPersonalizado, { foreignKey: 'id_usuario' });
PanelPersonalizado.belongsTo(Usuario, { foreignKey: 'id_usuario' });

// 🔗 Relación: Un paciente puede tener varios paneles personalizados
Paciente.hasMany(PanelPersonalizado, { foreignKey: 'id_paciente' });
PanelPersonalizado.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Paciente.hasMany(CitaMedica, { foreignKey: 'id_paciente' });
CitaMedica.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Paciente.hasMany(ActividadCuidado, { foreignKey: "id_paciente" });
ActividadCuidado.belongsTo(Paciente, { foreignKey: "id_paciente" });

Familiar.belongsTo(Paciente, { foreignKey: "id_paciente", as: "paciente_principal" });
Paciente.hasMany(Familiar, { foreignKey: "id_paciente", as: "listarFamiliar" });

Familiar.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });
  

// Exportar los modelos y la conexión de Sequelize
const models = { Usuario, Paciente, Familiar, Medico, UsuarioRed, PanelPersonalizado, CitaMedica, ActividadCuidado };
export { sequelize, models };