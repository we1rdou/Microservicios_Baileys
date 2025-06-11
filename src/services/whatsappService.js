import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import qrcode from 'qrcode-terminal';
import fs, { stat } from 'fs';
import { generateJWT } from './tokenService.js';   
import { updateConnectionState } from '../public-api/webInterface.js';
import { create } from 'domain';

let sock;
let isLogoutIntentional = false;

export const connectToWhatsApp = async (options = {}) => {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve('./auth_info_multi'));

    sock = makeWASocket({
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            updateConnectionState('disconnected', qr);
        }
        if (connection === 'close') {
            const shouldReconnect = !isLogoutIntentional && (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
            updateConnectionState('disconnected', '');
        } else if (connection === 'open') {
            console.log('Conexión establecida con WhatsApp Web');
            updateConnectionState('connected', '');

            //Verifica si la carpeta tiene informacion para generar el token
            const sessionId = state.creds.me?.id || null;
            if (sessionId) {
                const payload = { sessionId };
                const token = generateJWT(payload);
                console.log('Token generado para sesión:', token);
        }
    }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('error', (err) => {
        console.error('Error en la conexión:', err);
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
            console.error('Error al procesar el mensaje:', err);
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
};

export const disconnectFromWhatsApp = () => {
    if (sock) {
        isLogoutIntentional = true;
        sock.logout();
        console.log('Sesión cerrada');
        updateConnectionState('disconnected', '');
        isLogoutIntentional = false;
    }
};

export const getSock = () => sock;