import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import sequelize from './database/db.js';
import './database/model/User.js';
import './database/model/Device.js';

import whatsappRoutes from './routes/whatsappRoutes.js';
import messageReceiver from './public-api/messageReceiver.js';
import auhRoutes from './routes/auhRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';

dotenv.config();

// Inicialización
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middlewares
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, // Permite enviar cookies
}));
app.use(express.json());
app.set('io', io);

// Rutas API
app.use('/api', whatsappRoutes);    // Rutas de WhatsApp
app.use('/api', messageReceiver); // Recepción y envío de mensajes vía WhatsApp
app.use('/api', auhRoutes); // 💡 Esto registra /api/register-number
app.use('/api/devices', deviceRoutes); // Rutas para dispositivos

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
