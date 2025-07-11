import express from 'express';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import { loginAdmin, loginUsuario, cambiarPassword } from '../controllers/authController.js';
const router = express.Router();

// Login de usuarios y admin (no requieren token)
router.post('/login-user', loginUsuario);
router.post('/login-admin', loginAdmin);

// Aplicar middleware de verificación de token para el resto
router.use(verifyTokenMiddleware);
router.post('/cambiar-password', cambiarPassword);

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
