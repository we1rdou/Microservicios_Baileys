import express from 'express';
import { 
  listarUsuarios, 
  listarDispositivos, 
  asignarPasswordUsuario, 
  verActividadUsuario 
} from '../controllers/adminController.js';
import { regenerarTokenDispositivo } from '../controllers/deviceController.js';
import { registrarNumero } from '../controllers/authController.js';
import { verificarAdmin } from '../auth/verifyAdmin.js';

const router = express.Router();

// Middleware para verificar que el usuario es admin
router.use(verificarAdmin);

// Ruta para listar todos los usuarios
router.get('/usuarios', listarUsuarios);

// Ruta para listar todos los dispositivos
router.get('/dispositivos', listarDispositivos);

// Ruta para cambiar la contraseña de un usuario
router.put('/usuarios/:id/password', asignarPasswordUsuario);

// Ruta para ver la actividad de un usuario
router.get('/usuarios/:id/actividad', verActividadUsuario);

// Ruta para regenerar el token de un dispositivo
router.put('/dispositivos/:id/token', regenerarTokenDispositivo);

// Ruta para registrar número
router.post('/register-number', registrarNumero);

export default router;
