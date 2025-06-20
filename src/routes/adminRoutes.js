import express from 'express';
import verifyToken from '../auth/verifyToken.js';
import { registrarNumero } from '../controllers/authController.js';

const router = express.Router();

router.post('/register-number', verifyToken, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo admin puede registrar números' });
  }
  next();
}, registrarNumero);

export default router;
