import sequelize from '../config/db.js';
import Usuario from './usuario.model.js';
import Paciente from './paciente.model.js';
import Familiar from './Familiar.js';
import Medico from './Medico.js';
import Red from './Red.js';
import PanelPersonalizado from './panel_personalizado.js';
import CitaMedica from './cita_medica.js';
import { ActividadCuidado } from './activity.model.js';
import Medicamento from './medicamento.model.js';
import PacienteMedicamento from './pacienteMedicamento.model.js';
import CodigoQR from './codigoQr.model.js';
import UsuarioRed from './UsuarioRed.js'
import Colaborador from './colaborador.model.js';


// Paciente.hasOne(CodigoQR, { foreignKey: "id_paciente", as: "codigo_qr" });  
// CodigoQR.belongsTo(Paciente, { foreignKey: "id_paciente", as: "paciente" });  


// Definir relaciones entre los modelos
Paciente.hasMany(Familiar, { foreignKey: 'id_paciente', as: 'familiares' });
Familiar.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Usuario.hasMany(Paciente, { foreignKey: 'id_usuario' });
Paciente.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Medico.belongsTo(Usuario, { foreignKey: "id_usuario" });
Usuario.hasOne(Medico, { foreignKey: "id_usuario" });

// // Después de definir todos los modelos
// UsuarioRed.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id_usuario', as: 'usuario' });
  
// Usuario.hasMany(UsuarioRed, { foreignKey: 'id_usuario', as: 'redes' });

// Usuario.belongsToMany(Red, { through: Red, foreignKey: "id_usuario" });
// Red.belongsToMany(Usuario, { through: Red, foreignKey: "id_red" });

Usuario.hasMany(PanelPersonalizado, { foreignKey: 'id_usuario' });
PanelPersonalizado.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Paciente.hasMany(PanelPersonalizado, { foreignKey: 'id_paciente' });
PanelPersonalizado.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Paciente.hasMany(CitaMedica, { foreignKey: 'id_paciente' });
CitaMedica.belongsTo(Paciente, { foreignKey: 'id_paciente' });

Paciente.hasMany(ActividadCuidado, { foreignKey: "id_paciente" });
ActividadCuidado.belongsTo(Paciente, { foreignKey: "id_paciente" });

Familiar.belongsTo(Paciente, { foreignKey: "id_paciente", as: "paciente_principal" });
Paciente.hasMany(Familiar, { foreignKey: "id_paciente", as: "listarFamiliar" });

Familiar.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });

Medicamento.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });

Usuario.belongsToMany(Red, { through: UsuarioRed,foreignKey: 'id_usuario', as: 'redes' });

Red.belongsToMany(Usuario, { through: UsuarioRed, foreignKey: 'id_red', as: 'miembros' });

UsuarioRed.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });
UsuarioRed.belongsTo(Red, { foreignKey: "id_red", as: "red" });

Red.hasMany(UsuarioRed, { foreignKey: "id_red" });
UsuarioRed.belongsTo(Red, { foreignKey: "id_red" });

Paciente.hasMany(PacienteMedicamento, { foreignKey: 'id_paciente' });
Medicamento.hasMany(PacienteMedicamento, { foreignKey: 'id_medicamento' });

PacienteMedicamento.belongsTo(Paciente, { foreignKey: 'id_paciente' });
PacienteMedicamento.belongsTo(Medicamento, { foreignKey: 'id_medicamento' });


Paciente.hasOne(CodigoQR, { foreignKey: "id_paciente", as: "codigo_qr" });
CodigoQR.belongsTo(Paciente, { foreignKey: "id_paciente", as: "paciente" });


Usuario.hasMany(Colaborador, { foreignKey: 'id_usuario' });
Colaborador.belongsTo(Usuario, { foreignKey: 'id_usuario' });


Paciente.hasMany(Colaborador, { foreignKey: 'id_paciente' });
Colaborador.belongsTo(Paciente, { foreignKey: 'id_paciente' });



// Exportar los modelos y la conexión de Sequelize
const models = { Usuario, Paciente, Familiar, Medico, Red, PanelPersonalizado, CitaMedica, ActividadCuidado, UsuarioRed, Medicamento, PacienteMedicamento, CodigoQR, Colaborador };
export { sequelize, models };