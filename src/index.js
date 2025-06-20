import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import cookieParser from 'cookie-parser';
import sequelize from './database/db.js';
import './database/model/User.js';
import './database/model/Device.js';

import session from './auth/session.js';
import webInterface from './public-api/webInterface.js';
import messageReceiver from './public-api/messageReceiver.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

// Inicialización
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.set('io', io);

// Rutas API
app.use('/api', session);         // Login, logout, creación de usuarios
app.use('/api', webInterface);    // Lógica de conexión web
app.use('/api', messageReceiver); // Recepción y envío de mensajes vía WhatsApp
app.use('/api', adminRoutes); // 💡 Esto registra /api/register-number

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Base de datos sincronizada con PostgreSQL');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos:', err);
  });
