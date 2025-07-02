import express from 'express';
import verifyToken from '../auth/verifyToken.js';
import { registrarNumero } from '../controllers/authController.js';
import { loginAdmin, loginUsuario } from '../controllers/authController.js';

const router = express.Router();

// Ruta para login de usuarios normales
router.post('/login-user', loginUsuario);

// Ruta para login del administrador
router.post('/login-admin', loginAdmin);

router.post('/register-number', verifyToken, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo admin puede registrar números' });
  }
  next();
}, registrarNumero);

router.post('/logout', (req, res) => {
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });

  res.json({ message: 'Sesión cerrada' });
});

export default router;
