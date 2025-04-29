import sequelize from '../config/db.js';
import Usuario from './usuario.model.js';
import Paciente from './paciente.model.js';
import Familiar from './Familiar.js';
import Medico from './Medico.js';

// Definir relaciones entre los modelos
Paciente.hasMany(Familiar, { foreignKey: 'id_paciente', as: 'familiares' });
Familiar.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Usuario.hasMany(Paciente, { foreignKey: 'id_usuario' });
Paciente.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Medico.belongsTo(Usuario, { foreignKey: "id_usuario" });
Usuario.hasOne(Medico, { foreignKey: "id_usuario" });

// Exportar los modelos y la conexión de Sequelize
const models = { Usuario, Paciente, Familiar, Medico };
export { sequelize, models };