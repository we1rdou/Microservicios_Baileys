import express from 'express';
import { confirmarConexionDispositivo, regenerarTokenDispositivo, verTokenContrasena } from '../controllers/deviceController.js';

const router = express.Router();

// Ruta para confirmar la conexión de un dispositivo
router.post('/confirmar', confirmarConexionDispositivo);

// Ruta para regenerar el token de un dispositivo
router.post('/regenerar/:id', regenerarTokenDispositivo);

// Ruta para verificar el token de un dispositivo con contraseña
router.post('/device/token', verTokenContrasena);

export default router;