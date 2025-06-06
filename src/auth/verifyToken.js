import { verifyJWT } from '../services/tokenService.js';

export default function verifyTokenMiddleware(req, res, next) {
    const token = req.cookies?.jwt_token;
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = payload; 
    next();
}
