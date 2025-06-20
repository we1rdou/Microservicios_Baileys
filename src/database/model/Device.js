import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';

const Device = sequelize.define('Device', {
  telefono: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('desconectado', 'conectado', 'error'),
    defaultValue: 'desconectado',
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expiraHasta: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});


// Relación uno a uno: un usuario tiene un solo dispositivo
User.hasOne(Device, { foreignKey: 'userId', onDelete: 'CASCADE' });
Device.belongsTo(User, { foreignKey: 'userId' });

export default Device;
