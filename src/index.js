import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import messageReceiver from './public-api/messageReceiver.js';
import dotenv from 'dotenv';
import { connectToWhatsApp } from './services/whatsappService.js';
import webInterface from './public-api/webInterface.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from './auth/session.js';
import cookieParser from 'cookie-parser';
import sequelize from './database/db.js';
import './database/model/User.js';
import './database/model/Device.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(cookieParser());
app.use(express.json());
app.use('/api', session);
app.use('/api', webInterface);
app.use(express.static(path.join(__dirname, 'public')));


messageReceiver(app, io); // <- aquí es donde se registran las rutas

connectToWhatsApp();

const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Base de datos sincronizada con PostgreSQL');
    httpServer.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
  });