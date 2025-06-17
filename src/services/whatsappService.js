import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import { generateJWT } from './tokenService.js';   
import { updateConnectionState } from '../public-api/webInterface.js';

// Mapa para almacenar múltiples sockets y estados
const sessions = new Map();
const sessionStates = new Map();

export const connectToWhatsApp = async (sessionId, options = {}) => {
    try {
        console.log(`🔄 Iniciando conexión para sesión: ${sessionId}`);
        
        // Crear directorio específico para esta sesión
        const sessionPath = path.resolve(`./auth_info_multi/${sessionId}`);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
            console.log(`📁 Directorio creado: ${sessionPath}`);
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // Para ver QR en terminal también
            browser: ['Runachay Bot', 'Chrome', '1.0.0']
        });

        // Almacenar el socket para esta sesión
        sessions.set(sessionId, sock);
        sessionStates.set(sessionId, { 
            connectionState: 'connecting', 
            qrCode: '', 
            isLogoutIntentional: false,
            sessionId: sessionId
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            // CORREGIDO: Verificar si el estado existe antes de usarlo
            let sessionState = sessionStates.get(sessionId);
            
            // Si no existe el estado, crear uno temporal para evitar errores
            if (!sessionState) {
                sessionState = { 
                    connectionState: 'disconnected', 
                    qrCode: '', 
                    isLogoutIntentional: true, // Asumir que fue intencional si no existe
                    sessionId: sessionId 
                };
            }
            
            console.log(`[${sessionId}] 📡 Connection update:`, { connection, hasQR: !!qr });
            
            if (qr) {
                console.log(`[${sessionId}] 📱 QR Code generado - Escanea con WhatsApp:`);
                sessionState.qrCode = qr;
                sessionState.connectionState = 'waiting_qr';
                // Solo actualizar si la sesión aún existe
                if (sessionStates.has(sessionId)) {
                    sessionStates.set(sessionId, sessionState);
                    updateConnectionState(sessionId, 'waiting_qr', qr);
                }
            }
            
            if (connection === 'close') {
                const shouldReconnect = !sessionState.isLogoutIntentional && 
                    (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                
                console.log(`[${sessionId}] ❌ Conexión cerrada. Reconnect: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    console.log(`[${sessionId}] 🔄 Reintentando en 3 segundos...`);
                    setTimeout(() => connectToWhatsApp(sessionId), 3000);
                } else {
                    console.log(`[${sessionId}] 🚪 Sesión terminada permanentemente`);
                    // Limpiar sesión si no se reconecta
                    sessions.delete(sessionId);
                    sessionStates.delete(sessionId);
                    
                    // Eliminar directorio solo si no fue logout intencional
                    if (!sessionState.isLogoutIntentional) {
                        const sessionPath = path.resolve(`./auth_info_multi/${sessionId}`);
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                        }
                    }
                }
                
                // Solo actualizar estado si la sesión aún existe en el mapa
                if (sessionStates.has(sessionId)) {
                    sessionState.connectionState = 'disconnected';
                    sessionStates.set(sessionId, sessionState);
                }
                updateConnectionState(sessionId, 'disconnected', '');
                
            } else if (connection === 'open') {
                console.log(`[${sessionId}] ✅ Conexión establecida con WhatsApp Web`);
                sessionState.connectionState = 'connected';
                sessionState.qrCode = '';
                
                // Solo actualizar si la sesión aún existe
                if (sessionStates.has(sessionId)) {
                    sessionStates.set(sessionId, sessionState);
                    updateConnectionState(sessionId, 'connected', '');

                    // Generar token específico para esta sesión
                    const sessionInfo = state.creds.me?.id || null;
                    if (sessionInfo) {
                        const payload = { sessionId, phone: sessionId, whatsappId: sessionInfo };
                        const token = generateJWT(payload);
                        console.log(`[${sessionId}] 🔑 Token generado`);
                    }
                }
            } else if (connection === 'connecting') {
                console.log(`[${sessionId}] 🔄 Conectando...`);
                sessionState.connectionState = 'connecting';
                
                // Solo actualizar si la sesión aún existe
                if (sessionStates.has(sessionId)) {
                    sessionStates.set(sessionId, sessionState);
                    updateConnectionState(sessionId, 'connecting', '');
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('error', (err) => {
            console.error(`[${sessionId}] ❌ Error:`, err);
        });

        sock.ev.on('messages.upsert', (message) => {
            try {
                const { messages, type } = message;
                console.log(`[${sessionId}] 📨 Tipo de mensaje: ${type}`);
                messages.forEach((msg) => {
                    const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
                    console.log(`[${sessionId}] 💬 ${msg.pushName}: ${content}`);
                });
            } catch (err) {
                console.error(`[${sessionId}] ❌ Error al procesar mensaje:`, err);
            }
        });

        return sock;
    } catch (error) {
        console.error(`[${sessionId}] ❌ Error al conectar:`, error);
        throw error;
    }
};

export const disconnectFromWhatsApp = (sessionId) => {
    const sock = sessions.get(sessionId);
    const sessionState = sessionStates.get(sessionId);
    
    if (sock && sessionState) {
        console.log(`[${sessionId}] 🚪 Iniciando cierre de sesión`);
        
        // CORREGIDO: Marcar como logout intencional ANTES de hacer logout
        sessionState.isLogoutIntentional = true;
        sessionStates.set(sessionId, sessionState); // Actualizar el estado en el mapa
        
        // Hacer logout
        sock.logout();
        
        // Esperar un poco antes de limpiar para que se procesen los eventos
        setTimeout(() => {
            console.log(`[${sessionId}] 🧹 Limpiando datos de sesión`);
            
            // Eliminar directorio de la sesión
            const sessionPath = path.resolve(`./auth_info_multi/${sessionId}`);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`[${sessionId}] 📁 Directorio eliminado: ${sessionPath}`);
            }
            
            // Limpiar mapas
            sessions.delete(sessionId);
            sessionStates.delete(sessionId);
            updateConnectionState(sessionId, 'disconnected', '');
            
            console.log(`[${sessionId}] ✅ Sesión completamente cerrada`);
        }, 1000); // Esperar 1 segundo
        
    } else {
        console.log(`[${sessionId}] ⚠️ No se encontró sesión activa para cerrar`);
    }
};

export const getSock = (sessionId) => {
    return sessions.get(sessionId);
};

export const getSessionState = (sessionId) => {
    return sessionStates.get(sessionId) || { connectionState: 'disconnected', qrCode: '' };
};

export const getAllSessions = () => {
    return Array.from(sessionStates.keys());
};

export const getSessionsStates = () => {
    const states = {};
    for (const [sessionId, state] of sessionStates.entries()) {
        states[sessionId] = state;
    }
    return states;
};