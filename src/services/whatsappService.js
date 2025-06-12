import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import path from 'path';
import fs from 'fs';
import { generateJWT } from './tokenService.js';
import { updateConnectionState } from '../public-api/webInterface.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajustar la ruta para buscar el archivo en la raíz de la carpeta src
const authorizedUsersPath = path.resolve(__dirname, '../authorized_users.json');
const authorizedUsers = JSON.parse(fs.readFileSync(authorizedUsersPath, 'utf-8'));

const sockets = {}; // Almacena los sockets por sessionId
let isLogoutIntentional = false;

export const connectToWhatsApp = async (sessionId, options = {}) => {
    try {
        // Validar si el número está autorizado
        if (!authorizedUsers.includes(sessionId)) {
            throw new Error(`Número no autorizado: ${sessionId}`);
        }

        const sessionPath = path.resolve(__dirname, `../auth_info_multi/${sessionId}`);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
        });

        sockets[sessionId] = sock; // Guardar el socket en el objeto

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                updateConnectionState(sessionId, 'disconnected', qr);
            }

            if (connection === 'close') {
                const shouldReconnect = !isLogoutIntentional && (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                if (shouldReconnect) {
                    connectToWhatsApp(sessionId);
                }
                updateConnectionState(sessionId, 'disconnected', '');
            } else if (connection === 'open') {
                console.log(`Conexión establecida con WhatsApp Web para sesión: ${sessionId}`);
                updateConnectionState(sessionId, 'connected', '');

                // Generar token si la sesión está activa
                const userId = state.creds.me?.id || null;
                if (userId) {
                    const payload = { sessionId: userId };
                    const token = generateJWT(payload);
                    console.log('Token generado para sesión:', token);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('error', (err) => {
            console.error(`Error en la conexión para sesión ${sessionId}:`, err);
        });

        sock.ev.on('messages.upsert', (message) => {
            try {
                const { messages, type } = message;
                console.log(`Tipo de mensaje: ${type}`);
                messages.forEach((msg) => {
                    const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
                    console.log(`Mensaje de ${msg.pushName}: ${content}`);
                });
            } catch (err) {
                console.error(`Error al procesar el mensaje para sesión ${sessionId}:`, err);
            }
        });

        if (options.generateQrOnly) {
            return new Promise((resolve, reject) => {
                if (!sock) {
                    reject(new Error('Socket no inicializado'));
                    return;
                }
                sock.ev.on('connection.update', ({ qr }) => {
                    if (qr) resolve(qr);
                });
            });
        }
    } catch (error) {
        console.error(`Error al conectar la sesión ${sessionId}:`, error);
        throw error;
    }
};

export const disconnectFromWhatsApp = (sessionId) => {
    const sock = sockets[sessionId];
    if (sock) {
        isLogoutIntentional = true;
        sock.logout();
        console.log(`Sesión cerrada para sesión: ${sessionId}`);
        updateConnectionState(sessionId, 'disconnected', '');

        // Eliminar solo la carpeta de la sesión específica
        const sessionPath = path.resolve(__dirname, `../auth_info_multi/${sessionId}`);
        fs.rmSync(sessionPath, { recursive: true, force: true });

        delete sockets[sessionId]; // Eliminar el socket del objeto
        isLogoutIntentional = false;
    } else {
        console.warn(`No se encontró una sesión activa para ${sessionId}`);
    }
};

export const getSock = (sessionId) => sockets[sessionId];