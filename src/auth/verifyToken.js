import { verifyJWT } from '../services/tokenService.js';

export default function verifyTokenMiddleware(req, res, next) {
  const token = req.cookies?.jwt_token;
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = {
      ...payload,
      phone: payload.telefono || payload.username, // Aseguramos que phone tenga un valor
    };
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
}
