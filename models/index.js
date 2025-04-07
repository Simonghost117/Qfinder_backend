import Sequelize from 'sequelize';
import sequelize from '../config/db.js';

import PacienteModel from './paciente.js';
import CitaMedicaModel from './cita_medica.js';
import PanelPersonalizadoModel from './panel_personalizado.js';

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;


db.Paciente = PacienteModel(sequelize, Sequelize.DataTypes);
db.CitaMedica = CitaMedicaModel(sequelize, Sequelize.DataTypes);
db.PanelPersonalizado = PanelPersonalizadoModel(sequelize, Sequelize.DataTypes);

db.Paciente.hasMany(db.CitaMedica, { foreignKey: 'id_paciente' });
db.CitaMedica.belongsTo(db.Paciente, { foreignKey: 'id_paciente' });

db.Paciente.hasMany(db.PanelPersonalizado, { foreignKey: 'id_paciente' });
db.PanelPersonalizado.belongsTo(db.Paciente, { foreignKey: 'id_paciente' });

export default db;
