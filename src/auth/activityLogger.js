import ActivityLog from '../database/model/ActivityLog.js';
import Device from '../database/model/Device.js';

// Middleware para registrar actividad del usuario
export const registrarActividadUsuario = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return next();
    }

    const device = await Device.findOne({ where: { userId: user.id } });

    await ActivityLog.create({
      userId: user.id,
      deviceId: device ? device.id : null,
      accion: `${req.method} ${req.originalUrl}`,
      descripcion: `Acceso a ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

  } catch (err) {
    console.error('⚠️ Error registrando actividad:', err);
  }

  next();
};
