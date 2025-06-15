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

app.use(cookieParser());
app.use(express.json());

// AGREGADO: Configurar io para que esté disponible en las rutas
app.set('io', io);

// Rutas de API
app.use('/api', session);
app.use('/api', webInterface);
app.use('/api', messageReceiver); // CORREGIDO: Usar como middleware directo

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// AGREGADO: Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// REMOVIDO: Ya no iniciamos automáticamente WhatsApp
console.log('🚀 Servidor iniciado. Las sesiones de WhatsApp se inicializarán bajo demanda.');

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌐 Servidor ejecutándose en http://localhost:${PORT}`);
});