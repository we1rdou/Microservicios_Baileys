import express from 'express';
import { generateJWT } from '../services/tokenService.js';
import { isNumberAuthorized } from '../services/numberAuthService.js';
import { connectToWhatsApp } from '../services/whatsappService.js';
import { loginAdmin } from '../controllers/authController.js';

const router = express.Router();

/**
 * Ruta para iniciar sesión y generar sesión de WhatsApp
 * Requiere número autorizado previamente por el administrador
 */
router.post('/login', loginAdmin);
router.post('/session', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Número no proporcionado' });
  }

  const autorizado = await isNumberAuthorized(phone);
  if (!autorizado) {
    return res.status(403).json({ error: 'Número no autorizado por el administrador' });
  }

  try {
    // Iniciar conexión de WhatsApp (puede lanzar QR o reactivar sesión)
    await connectToWhatsApp(phone);

    // Generar JWT para controlar la sesión desde el navegador
    const token = generateJWT({ phone, sessionId: phone });

    // Guardar cookie JWT
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 86400000, // 1 día
    });

    res.json({
      message: 'Sesión iniciada correctamente',
      phone,
      sessionId: phone
    });
  } catch (error) {
    console.error('❌ Error al inicializar sesión de WhatsApp:', error);
    res.status(500).json({ error: 'Error al conectar con WhatsApp' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });

  res.json({ message: 'Sesión cerrada' });
});


export default router;
