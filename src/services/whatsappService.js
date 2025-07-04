import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import path from 'path';
import pino from 'pino';
import fs from 'fs';
import { updateConnectionState } from '../routes/whatsappRoutes.js';
import { generarTokenParaDispositivo } from './deviceService.js';
import Device from '../database/model/Device.js';
import e from 'express';

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
                console.log(`[${sessionId}] 🔄 Reintentando conexión`);
                connectToWhatsApp(sessionId); 
            } else {
                console.log(`[${sessionId}] 🛑 Sesión cerrada definitivamente`);
                deleteSession(sessionId);
                deleteSessionState(sessionId);
                deleteSessionDirectory(sessionId);
                updateConnectionState(sessionId, 'disconnected', '');
            }
        } 
        else if (connection === 'open') {
            console.log(`[${sessionId}] ✅ Conectado`);
            sessionState.connectionState = 'connected';
            sessionState.qrCode = '';
            setSessionState(sessionId, sessionState);

            // Generar/actualizar token y verificar si es primera conexión
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
                
                // Actualizar estado con información del token
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

// 🔌 Función principal de conexión
export async function connectToWhatsApp(sessionId) {
    try {
        console.log(`🔄 Iniciando conexión WhatsApp para: ${sessionId}`);
        const sessionPath = ensureSessionDirectory(sessionId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        // 1. Crear socket con configuración
        const sock = makeWASocket({
            auth: state,
            version: [2, 3000, 1023223821], // Versión compatible
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

        // 2. Guardar estado en memoria
        setSession(sessionId, sock);
        setSessionState(sessionId, {
            connectionState: 'connecting',
            isLogoutIntentional: false,
            sessionId,
            mostrarToken: false,
            token: undefined,
            qrCode: '' // Asegura que esté inicializado
        });

        // 3. Configurar eventos desde función centralizada
        setupSocketEvents(sock, sessionId, saveCreds);

        console.log(`[${sessionId}] Socket configurado correctamente`);
        return sock;

    } catch (error) {
        console.error(`[${sessionId}] ❌ Error crítico al conectar:`, error);
        updateConnectionState(sessionId, 'error', '', `Error: ${error.message}`);
        throw error;
    }
}


// 🔌 Desconexión de sesión
export async function disconnectFromWhatsApp(sessionId) {
    const sock = getSession(sessionId);
    if (sock) {
        await sock.logout();
        deleteSession(sessionId);
        deleteSessionState(sessionId);
        deleteSessionDirectory(sessionId);

        try {
            await Device.update({
                estado: 'desconectado',
                fechaDesvinculacion: new Date()
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
    
    // Consultar en DB si es primera conexión
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