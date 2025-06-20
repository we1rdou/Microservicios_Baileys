import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import path from 'path';
import fs from 'fs';
import { generateJWT } from './tokenService.js';   
import { updateConnectionState } from '../public-api/webInterface.js';

// Sesiones en memoria
const sessions = new Map();
const sessionStates = new Map();

// 📁 Utilidades de autenticación y archivos
function getSessionPath(sessionId) {
    return path.resolve(`./auth_info_multi/${sessionId}`);
}

function ensureSessionDirectory(sessionId) {
    const sessionPath = getSessionPath(sessionId);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
    return sessionPath;
}

function deleteSessionDirectory(sessionId) {
    const sessionPath = getSessionPath(sessionId);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
}

// 🧠 Manejo de estado en memoria
function setSession(sessionId, sock) {
    sessions.set(sessionId, sock);
}

function getSession(sessionId) {
    return sessions.get(sessionId);
}

function deleteSession(sessionId) {
    sessions.delete(sessionId);
}

export function setSessionState(sessionId, state) {
    sessionStates.set(sessionId, state);
}

export function getSessionState(sessionId) {
    return sessionStates.get(sessionId);
}

function deleteSessionState(sessionId) {
    sessionStates.delete(sessionId);
}

// 🔧 Manejador de eventos del socket
function setupSocketEvents(sock, sessionId, saveCreds) {
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        let sessionState = getSessionState(sessionId) || {
            connectionState: 'disconnected',
            qrCode: '',
            isLogoutIntentional: true,
            sessionId
        };

        if (qr) {
            // 🚫 No generar QR si fue detenido por el frontend
            if (sessionState.qrStopped) {
                console.log(`[${sessionId}] ⛔ QR ignorado (detenido desde frontend)`);
                return;
            }

            console.log(`[${sessionId}] 📱 QR generado`);
            sessionState.qrCode = qr;
            sessionState.connectionState = 'waiting_qr';
            setSessionState(sessionId, sessionState);
            updateConnectionState(sessionId, 'waiting_qr', qr);
        }

        if (connection === 'close') {
        const shouldReconnect = !sessionState.isLogoutIntentional &&
            !sessionState.qrStopped &&
            (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);

            // Manejo de cierre de conexión
            if (shouldReconnect) {
                console.log(`[${sessionId}] 🔄 Reintentando conexión`);
                connectToWhatsApp(sessionId); 
            } else {
                console.log(`[${sessionId}] 🛑 Sesión cerrada definitivamente`);
                deleteSession(sessionId);
                deleteSessionState(sessionId);
                deleteSessionDirectory(sessionId);
                updateConnectionState(sessionId, 'disconnected', '');
            }

        } else if (connection === 'open') {
            console.log(`[${sessionId}] ✅ Conectado`);
            sessionState.connectionState = 'connected';
            sessionState.qrCode = '';
            setSessionState(sessionId, sessionState);
            updateConnectionState(sessionId, 'connected', '');

            // Aquí podrías generar un token JWT si es necesario
            // const sessionInfo = sock.authState.creds.me?.id || null;
            // if (sessionInfo) {
            //     const payload = { sessionId, phone: sessionId, whatsappId: sessionInfo };
            //     const token = generateJWT(payload);
            //     console.log(`[${sessionId}] 🔑 Token generado`);
            // }

        } else if (connection === 'connecting') {
            console.log(`[${sessionId}] 🔄 Conectando...`);
            sessionState.connectionState = 'connecting';
            setSessionState(sessionId, sessionState);
            updateConnectionState(sessionId, 'connecting', '');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('error', (err) => {
        console.error(`[${sessionId}] ❌ Error:`, err);
    });

    sock.ev.on('messages.upsert', (message) => {
        const { messages, type } = message;
        console.log(`[${sessionId}] 📨 Tipo: ${type}`);
        messages.forEach((msg) => {
            const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            console.log(`[${sessionId}] 💬 ${msg.pushName}: ${content}`);
        });
    });
}

// 🔌 Función principal de conexión
export async function connectToWhatsApp(sessionId) {
    try {
        console.log(`🔄 Iniciando conexión: ${sessionId}`);
        const sessionPath = ensureSessionDirectory(sessionId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Runachay Bot', 'Chrome', '1.0.0']
        });

        setSession(sessionId, sock);
        setSessionState(sessionId, {
            connectionState: 'connecting',
            qrCode: '',
            isLogoutIntentional: false,
            sessionId
        });

        setupSocketEvents(sock, sessionId, saveCreds);
        return sock;

    } catch (error) {
        console.error(`[${sessionId}] ❌ Error al conectar:`, error);
        throw error;
    }
}

// 🔌 Desconexión de sesión
export function disconnectFromWhatsApp(sessionId) {
    const sock = getSession(sessionId);
    const state = getSessionState(sessionId);

    if (sock && state) {
        console.log(`[${sessionId}] 🚪 Cerrando sesión...`);
        state.isLogoutIntentional = true;
        setSessionState(sessionId, state);
        sock.logout(); // Esperamos que el evento 'connection.update' maneje la limpieza
    } else {
        console.log(`[${sessionId}] ⚠️ Sesión no encontrada`);
    }
}

// 🧾 Utilidades adicionales
export function getSock(sessionId) {
    return getSession(sessionId);
}

export function getSessionInfo(sessionId) {
    return getSessionState(sessionId) || { connectionState: 'disconnected', qrCode: '' };
}

export function getAllSessions() {
    return Array.from(sessionStates.keys());
}

export function getSessionsStates() {
    const states = {};
    for (const [id, state] of sessionStates.entries()) {
        states[id] = state;
    }
    return states;
}
