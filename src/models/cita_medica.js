export default (sequelize, DataTypes) => {
    const CitaMedica = sequelize.define('CitaMedica', {
      id_cita: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_paciente: DataTypes.INTEGER,
      id_medico: DataTypes.INTEGER,
      fecha_cita: DataTypes.DATE,
      motivo_cita: DataTypes.TEXT,
      resultado_consulta: DataTypes.TEXT,
      estado: DataTypes.ENUM('programada', 'completada', 'cancelada')
    }, {
      tableName: 'cita_medica',
      timestamps: false,
    });
  
    return CitaMedica;
  };
  