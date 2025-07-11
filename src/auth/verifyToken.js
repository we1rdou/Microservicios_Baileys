import { verifyJWT } from '../services/tokenService.js';
import Device from '../database/model/Device.js';
import User from '../database/model/User.js';

// Middleware para verificar el token JWT
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
      res.clearCookie('jwt_token');
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    if (payload.role === 'device') {
      if (!payload.telefono) {
        res.clearCookie('jwt_token');
        return res.status(403).json({ error: 'Token de dispositivo sin número' });
      }

      const dispositivo = await Device.findOne({
        where: { telefono: payload.telefono }
      });

      if (!dispositivo || dispositivo.token !== token) {
        res.clearCookie('jwt_token');
        return res.status(403).json({ error: 'Token revocado o no autorizado' });
      }

      req.user = {
        ...payload,
        id: dispositivo.userId,
        role: 'device'
      };

    } else {
      const usuario = await User.findByPk(payload.id);
      if (!usuario) {
        res.clearCookie('jwt_token');
        return res.status(403).json({ error: 'Usuario no existe o fue eliminado' });
      }

      req.user = {
        ...payload,
        role: usuario.rol || 'admin'
      };
    }

    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    res.clearCookie('jwt_token');
    return res.status(401).json({ error: 'Token inválido' });
  }
}
