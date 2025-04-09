module.exports = (sequelize, DataTypes) => {
    const UsuarioRed = sequelize.define('UsuarioRed', {
      usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      redId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    return UsuarioRed;
  };
  