import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import path from 'path';
import pino from 'pino';
import fs from 'fs';
import { updateConnectionState } from '../routes/whatsappRoutes.js';
import { generarTokenParaDispositivo } from './deviceService.js';
import Device from '../database/model/Device.js';

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

function cleanupSession(sessionId) {
    const sock = getSession(sessionId);
    if (sock?.ev) {
        sock.ev.removeAllListeners();
    }
    deleteSession(sessionId);
    deleteSessionState(sessionId);
    deleteSessionDirectory(sessionId);
}

// 🔧 Manejador de eventos del socket
function setupSocketEvents(sock, sessionId, saveCreds) {
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        let sessionState = getSessionState(sessionId) || {
            connectionState: 'disconnected',
            qrCode: '',
            isLogoutIntentional: true,
            sessionId
        };

        if (qr) {
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

            if (shouldReconnect) {
                console.log(`[${sessionId}] 🔄 Reintentando conexión en 3 segundos`);
                setTimeout(() => {
                    connectToWhatsApp(sessionId);
                }, 3000);
            } else {
                console.log(`[${sessionId}] 🛑 Sesión cerrada definitivamente`);
                cleanupSession(sessionId);
                updateConnectionState(sessionId, 'disconnected', '');
            }
        } 
        else if (connection === 'open') {
            console.log(`[${sessionId}] ✅ Conectado`);
            sessionState.connectionState = 'connected';
            sessionState.qrCode = '';
            setSessionState(sessionId, sessionState);

            try {
                const device = await Device.findOne({ where: { telefono: sessionId } });
                const { token, reutilizado } = await generarTokenParaDispositivo(sessionId);

                await Device.update({
                    estado: 'conectado',
                    fechaDesvinculacion: null,
                }, {
                    where: { telefono: sessionId }
                });
                console.log(`[${sessionId}] ✅ Dispositivo vinculado correctamente`);

                sessionState.mostrarToken = device?.tokenVisible || false;
                sessionState.token = sessionState.mostrarToken ? token : undefined;
                setSessionState(sessionId, sessionState);

                updateConnectionState(sessionId, 'connected', '', {
                    mostrarToken: sessionState.mostrarToken,
                    token: sessionState.token
                });

                if (reutilizado) {
                    console.log(`[${sessionId}] 📌 Token reutilizado`);
                } else {
                    console.log(`[${sessionId}] 📄 Nuevo token generado`);
                }
            } catch (err) {
                console.error(`[${sessionId}] ❌ Error al generar token:`, err);
                updateConnectionState(sessionId, 'connected', '');
            }
        } 
        else if (connection === 'connecting') {
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

function isCredsFileValid(sessionId) {
  const credsPath = path.join(getSessionPath(sessionId), 'creds.json');
  if (!fs.existsSync(credsPath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    return !!data && typeof data === 'object' && Object.keys(data).length > 0;
  } catch (err) {
    return false;
  }
}

// 🔌 Función principal de conexión
export async function connectToWhatsApp(sessionId) {
    try {
        console.log(`🔄 Iniciando conexión WhatsApp para: ${sessionId}`);
        const sessionPath = getSessionPath(sessionId);

        // 🧹 Si el archivo creds.json no es válido o está vacío, borra carpeta
        if (!isCredsFileValid(sessionId)) {
            console.log(`[${sessionId}] ⚠️ creds.json inválido o vacío. Eliminando carpeta y forzando nueva conexión.`);
            deleteSessionDirectory(sessionId);
        }

        // 🧱 Asegurar que carpeta exista (se recrea si fue eliminada)
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            version: [2, 3000, 1023223821],
            browser: ['Runachay Bot', 'Chrome', '1.0.0'],
            generateMissedCallMessage: true,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            logger: pino({ level: 'silent' }),
            getMessage: async () => ({}),
            shouldIgnoreJid: () => false
        });

        // Guardar en memoria
        setSession(sessionId, sock);
        setSessionState(sessionId, {
            connectionState: 'connecting',
            isLogoutIntentional: false,
            sessionId,
            mostrarToken: false,
            token: undefined,
            qrCode: ''
        });

        setupSocketEvents(sock, sessionId, saveCreds);

        console.log(`[${sessionId}] Socket configurado correctamente`);
        return sock;

    } catch (error) {
        console.error(`[${sessionId}] ❌ Error crítico al conectar:`, error);
        updateConnectionState(sessionId, 'error', '', `Error: ${error.message}`);
        throw error;
    }
}

// 🔌 Desconexión de sesión del dispositivo
export async function disconnectFromWhatsApp(sessionId) {
    const sock = getSession(sessionId);
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            console.warn(`[${sessionId}] ⚠️ Error durante logout: ${e.message}`);
        }

        cleanupSession(sessionId);

        try {
            await Device.update({
                estado: 'desconectado',
                fechaDesvinculacion: new Date(),
                token: null,
            }, {
                where: { telefono: sessionId }  
            });
            console.log(`[${sessionId}] ✅ Dispositivo desvinculado correctamente`);
        } catch (error) {
            console.error(`[${sessionId}] ❌ Error al desvincular dispositivo:`, error);
        }
    }
}

// 🧾 Utilidades adicionales
export function getSock(sessionId) {
    return getSession(sessionId);
}

export async function getSessionInfo(sessionId) {
    const state = getSessionState(sessionId) || { 
        connectionState: 'disconnected', 
        qrCode: '',
        mostrarToken: false
    };

    if (state.connectionState === 'connected') {
        const device = await Device.findOne({ where: { telefono: sessionId } });
        return {
            ...state,
            mostrarToken: device?.tokenVisible || false,
            token: device?.tokenVisible ? device?.token : undefined
        };
    }
    return state;
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
