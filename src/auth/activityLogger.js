import ActivityLog from '../database/model/ActivityLog.js';

export const registrarActividadUsuario = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role === 'admin') return next(); 

    const userId = user.userId || user.id;
    const deviceId = user.deviceId || null;

    await ActivityLog.create({
      userId,
      deviceId,
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
