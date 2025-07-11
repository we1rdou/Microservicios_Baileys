import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';
import Device from './Device.js';

const ActivityLog = sequelize.define('ActivityLog', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  accion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Relaciones
User.hasMany(ActivityLog, { foreignKey: 'userId' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });

Device.hasMany(ActivityLog, { foreignKey: 'deviceId' });
ActivityLog.belongsTo(Device, { foreignKey: 'deviceId' });

export default ActivityLog;
