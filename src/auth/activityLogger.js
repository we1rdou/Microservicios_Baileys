import ActivityLog from '../database/model/ActivityLog.js';
import Device from '../database/model/Device.js';

export const registrarActividadUsuario = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role === 'admin') return next(); // solo registrar si no es admin

    const device = await Device.findOne({ where: { userId: user.id } });

    await ActivityLog.create({
      userId: user.id,
      deviceId: device?.id || null,
      accion: `${req.method} ${req.originalUrl}`,
      descripcion: `Acceso a ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    console.error('Error registrando actividad:', err);
  }
  next();
};
