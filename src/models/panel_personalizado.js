export default (sequelize, DataTypes) => {
    const PanelPersonalizado = sequelize.define('PanelPersonalizado', {
      id_panel: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_usuario: DataTypes.INTEGER,
      id_paciente: DataTypes.INTEGER,
      plan_tratamiento: DataTypes.TEXT,
      terapia_recomendada: DataTypes.TEXT
    }, {
      tableName: 'panel_personalizado',
      timestamps: false,
    });
  
    return PanelPersonalizado;
  };
  