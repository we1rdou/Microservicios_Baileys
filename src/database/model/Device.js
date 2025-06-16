import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';

const Device = sequelize.define('Device', {
  deviceName: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  timestamps: true
});

User.hasMany(Device, { foreignKey: 'userId' });
Device.belongsTo(User, { foreignKey: 'userId' });

export default Device;
