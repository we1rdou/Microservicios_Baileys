import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/**
 * Genera un JWT con información personalizada.
 * @param {Object} payload - Información a incluir en el token.
 * @param {string|number} expiresIn - Tiempo de expiración (ej: '1h', '7d').
 * @returns {string} JWT generado.
 */
export function generateJWT(payload = {}, expiresIn = '1d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifica y decodifica un JWT.
 * @param {string} token - El token JWT a verificar.
 * @returns {Object|null} El payload decodificado o null si no es válido.
 */
export function verifyJWT(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        console.error('Error al verificar el token:', err.message);
        return null;
    }
}