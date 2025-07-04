import express from 'express';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import { loginAdmin, loginUsuario } from '../controllers/authController.js';
import { registrarActividadUsuario } from '../auth/activityLogger.js';

const router = express.Router();

// Login de usuarios y admin (no requieren token)
router.post('/login-user', loginUsuario);
router.post('/login-admin', loginAdmin);

// Aplicar middleware de verificación de token para el resto
router.use(verifyTokenMiddleware);

// Registrar actividad solo para usuarios normales
router.use(registrarActividadUsuario);

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  res.json({ message: 'Sesión cerrada' });
});

export default router;
