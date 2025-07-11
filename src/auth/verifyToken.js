import { verifyJWT } from '../services/tokenService.js';
import Device from '../database/model/Device.js';

export default async function verifyTokenMiddleware(req, res, next) {
  let token = req.cookies?.jwt_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // ⚠️ Si es dispositivo, validar token en base de datos
    if (payload.role === 'device') {
      if (!payload.telefono) {
        return res.status(403).json({ error: 'Token de dispositivo sin número' });
      }

      const dispositivo = await Device.findOne({
        where: { telefono: payload.telefono }
      });

      if (!dispositivo || dispositivo.token !== token) {
        return res.status(403).json({ error: 'Token revocado o no autorizado' });
      }

      req.user = {
        ...payload,
        id: dispositivo.userId,
      }
    }

    req.user = { ...payload };
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
}
