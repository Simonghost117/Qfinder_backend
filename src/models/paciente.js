export default (sequelize, DataTypes) => {
    const Paciente = sequelize.define('Paciente', {
      id_paciente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_usuario: { type: DataTypes.INTEGER },
      nombre: DataTypes.STRING,
      apellido: DataTypes.STRING,
      fecha_nacimiento: DataTypes.DATE,
      sexo: DataTypes.ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir'),
      diagnostico_principal: DataTypes.STRING,
      nivel_autonomia: DataTypes.ENUM('alta', 'media', 'baja'),
    }, {
      tableName: 'paciente',
      timestamps: false,
    });
  
    return Paciente;
  };
  