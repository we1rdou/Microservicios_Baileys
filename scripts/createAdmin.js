// scripts/createAdmin.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sequelize from '../src/database/db.js';
import User from '../src/database/model/User.js';

dotenv.config();

async function crearAdmin() {
  try {
    await sequelize.sync(); // Asegura que la tabla existe

    const username = 'admin';
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      console.log('⚠️ Ya existe un usuario administrador con ese username');
      return;
    }

    await User.create({
      username,
      password: hashedPassword,
      role: 'admin',
    });

    console.log(`✅ Admin creado exitosamente:
  Usuario: ${username}
  Contraseña: ${plainPassword}`);
    process.exit();
  } catch (err) {
    console.error('❌ Error al crear admin:', err);
    process.exit(1);
  }
}

crearAdmin();
