import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.resolve('./authorized_users.json');

/**
 * Verifica si un número está autorizado.
 * @param {string} number - Número en formato internacional.
 * @returns {boolean} true si está autorizado, false si no.
 */
export function isNumberAuthorized(number) {
    if (!fs.existsSync(AUTH_FILE)) return false;
    const list = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    return list.includes(number);
}