import express from 'express';
import { confirmarConexionDispositivo, regenerarTokenDispositivo, verTokenContrasena } from '../controllers/deviceController.js';

const router = express.Router();

router.post('/confirmar', confirmarConexionDispositivo);
router.post('/regenerar/:id', regenerarTokenDispositivo);
router.post('/device/token', verTokenContrasena);

export default router;