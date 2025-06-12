import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import messageReceiver from './public-api/messageReceiver.js';
import dotenv from 'dotenv';
import webInterface from './public-api/webInterface.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from './auth/session.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET no está definido en el archivo .env');
    process.exit(1);
}

app.use(cookieParser());
app.use(express.json());
app.use('/api', session);
app.use('/api', webInterface);
app.use(express.static(path.join(__dirname, 'public')));

messageReceiver(app, io); // Registrar rutas y eventos de WebSocket

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`Archivos estáticos servidos desde: ${path.join(__dirname, 'public')}`);
});