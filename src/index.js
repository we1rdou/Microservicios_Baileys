import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import messageReceiver from './public-api/messageReceiver.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());

messageReceiver(app, io); // <- aquí es donde se registran las rutas

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
