// scripts/createAdmin.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sequelize from '../src/database/db.js';
import User from '../src/database/model/User.js';

dotenv.config();

async function crearAdmin() {
  try {
    await sequelize.sync(); // Asegura que la tabla existe

    // Usar variables de entorno o valores predeterminados
    const username = process.env.ADMIN_USERNAME;
    const plainPassword = process.env.ADMIN_PASSWORD;
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
      passwordTemporal: false, // Asegurarse de que no sea temporal
    });

    console.log(`✅ Admin creado exitosamente:
  Usuario: ${username}
  Contraseña: ${plainPassword} (solo se muestra aquí)`);
  } catch (err) {
    console.error('❌ Error al crear admin:', err);
    process.exit(1);
  }
}

crearAdmin();
