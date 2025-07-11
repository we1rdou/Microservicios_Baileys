import jwt from 'jsonwebtoken';

// Middleware para verificar si el usuario es administrador
export const verificarAdmin = (req, res, next) => {
  const token = req.cookies?.jwt_token;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado: token faltante' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
    }

    req.user = decoded; // Guarda datos del usuario en la request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
