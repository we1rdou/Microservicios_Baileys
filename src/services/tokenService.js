import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

/**
 * Genera un JWT con información personalizada.
 * @param {Object} payload - Información a incluir en el token.
 * @param {string|number} expiresIn - Tiempo de expiración (ej: '1h', '7d').
 * @returns {string} JWT generado.
 */
export function generateJWT(payload = {}, expiresIn = '1d') {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

/**
 * Verifica y decodifica un JWT.
 * @param {string} token - El token JWT a verificar.
 * @returns {Object|null} El payload decodificado o null si no es válido.
 */
export function verifyJWT(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
}

/**
 * Guarda el JWT y el sessionId en un archivo.
 * @param {string} token - El token JWT.
 * @param {string} sessionId - El identificador de sesión.
 */
export function saveJWT(token, sessionId) {
    const tokenData = { token, sessionId, createdAt: new Date().toISOString() };
    fs.writeFileSync(path.resolve('./auth_token.json'), JSON.stringify(tokenData, null, 2));
}

/**
 * Lee el JWT y el sessionId guardados.
 * @returns {Object|null} Un objeto con token y sessionId si existen, si no null.
 */
export function getStoredJWT() {
    const tokenPath = path.resolve('./auth_token.json');
    if (fs.existsSync(tokenPath)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        return {
            token: tokenData.token || null,
            sessionId: tokenData.sessionId || null,
            createdAt: tokenData.createdAt || null
        };
    }
    return null;
}