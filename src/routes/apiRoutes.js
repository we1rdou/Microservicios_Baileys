// routes/apiRoutes.js
import express from 'express';
import whatsappRoutes from './whatsappRoutes.js';
import messageReceiver from '../public-api/messageReceiver.js';
import deviceRoutes from './deviceRoutes.js';

const router = express.Router();

// Estas rutas se protegerán y registrarán actividad
router.use(whatsappRoutes);
router.use(messageReceiver);
router.use('/devices', deviceRoutes);

export default router;
