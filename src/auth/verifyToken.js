import { verifyJWT } from '../services/tokenService.js';

export default function verifyTokenMiddleware(req, res, next) {
  // Buscar token en cookie o en header Authorization
  let token = req.cookies?.jwt_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
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

    req.user = {
      ...payload,
    };
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
}