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
import './database/model/ActivityLog.js'; // Añadir esta línea

import auhRoutes from './routes/auhRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { registrarActividadUsuario } from './auth/activityLogger.js';
import verifyTokenMiddleware from './auth/verifyToken.js';
import apiRouter from './routes/apiRoutes.js';

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
app.use('/api', auhRoutes); // 💡 Esto registra /api/register-number
app.use('/admin', adminRoutes); // Rutas de administración
app.use('/api', verifyTokenMiddleware, registrarActividadUsuario, apiRouter);
// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;

// Opciones de sincronización según entorno
const syncOptions = process.env.NODE_ENV === 'production' 
  ? { force: false }  // Más seguro para producción
  : { alter: false };  // Desarrollo

sequelize.sync(syncOptions)
  .then(() => {
    console.log('✅ Base de datos sincronizada con SQLite');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos:', err);
  });
