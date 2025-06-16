import express from 'express';
import { generateJWT } from '../services/tokenService.js';
import { isNumberAuthorized } from '../services/numberAuthService.js';
import User from '../database/model/User.js';

const router = express.Router();

router.post('/session', async (req, res) => {
    const { phone } = req.body; 

    if (!phone || !isNumberAuthorized(phone)) {
        return res.status(403).json({ error: 'Número no autorizado' });
    }

    const token = generateJWT({ phone });

    let user = await User.findOne({ where: { phone } });
    if(!user){
        user = await User.create({ phone, token });
    }else{
        user.token = token;
        await user.save();
    }

    res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 86400000,
    });

    res.json({ message: 'Sesión iniciada', phone });
});

export default router;
