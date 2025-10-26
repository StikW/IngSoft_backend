const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  // Autenticar usuario
  async login(email, password) {
    // Buscar usuario por email
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.contrasena);
    if (!validPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.correo,
        rol: user.rol_nombre,
      },
      process.env.JWT_SECRET || 'clave_secreta',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        telefono: user.telefono,
        rol: user.rol_nombre,
        rol_id: user.rol_id,
      }
    };
  }

  // Registrar nuevo usuario
  async register(userData) {
    const { nombre, correo, contrasena, telefono, rol_id } = userData;

    // Validar dominio institucional
    const institutionalDomain = '@uao.edu.co';
    if (!correo.toLowerCase().endsWith(institutionalDomain)) {
      throw new Error('Solo se permiten correos electrónicos institucionales (@uao.edu.co)');
    }

    // Validar que no se esté intentando registrar un secretario o administrador
    const parsedRolId = parseInt(rol_id);
    
    if (parsedRolId === 3) {
      throw new Error('No se permiten registros de secretarios académicos. Los secretarios están preconfigurados en el sistema.');
    }

    if (parsedRolId === 4) {
      throw new Error('No se permiten registros de administradores. Los administradores están preconfigurados en el sistema.');
    }

    // Verificar que el rol sea válido (solo 1, 2)
    if (![1, 2].includes(parsedRolId)) {
      throw new Error('Rol inválido. Solo se permiten registros para usuarios institucionales (Estudiante, Docente)');
    }

    // Verificar si el correo ya existe
    const emailExists = await userRepository.existsByEmail(correo);
    if (emailExists) {
      throw new Error('Ya existe un usuario con ese correo');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear el usuario
    const userId = await userRepository.create({
      nombre,
      correo,
      contrasena: hashedPassword,
      telefono,
      rol_id
    });

    return {
      id: userId,
      nombre,
      correo,
      telefono,
      rol_id,
    };
  }

  // Obtener usuario actual
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  // Actualizar perfil de usuario
  async updateProfile(userId, profileData) {
    const { nombre, telefono, nuevaContrasena } = profileData;

    // Validar que se proporcionó al menos el nombre
    if (!nombre || nombre.trim().length < 2) {
      throw new Error('El nombre es requerido y debe tener al menos 2 caracteres');
    }

    // Actualizar perfil básico
    await userRepository.updateProfile(userId, nombre.trim(), telefono);

    // Si se proporciona una nueva contraseña, actualizarla
    if (nuevaContrasena) {
      // Validar nueva contraseña
      if (nuevaContrasena.length < 4) {
        throw new Error('La contraseña debe tener al menos 4 caracteres');
      }

      if (nuevaContrasena.includes(' ')) {
        throw new Error('La contraseña no puede contener espacios');
      }

      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
      await userRepository.updatePassword(userId, hashedPassword);
    }

    // Obtener el usuario actualizado
    const updatedUser = await userRepository.findById(userId);
    
    if (!updatedUser) {
      throw new Error('Usuario no encontrado');
    }

    return updatedUser;
  }

  // Generar token de recuperación de contraseña
  async generatePasswordResetToken(email) {
    // Buscar usuario por email
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return null;
    }

    // Generar token de recuperación (válido por 1 hora)
    const resetToken = jwt.sign(
      { 
        userId: user.id,
        email: user.correo,
        type: 'password_reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      token: resetToken,
      user: {
        id: user.id,
        correo: user.correo,
        nombre: user.nombre
      }
    };
  }

  // Restablecer contraseña
  async resetPassword(token, newPassword) {
    // Verificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('El token de recuperación ha expirado');
      }
      throw new Error('Token de recuperación inválido');
    }

    // Verificar que es un token de recuperación
    if (decoded.type !== 'password_reset') {
      throw new Error('Token inválido');
    }

    // Verificar que el usuario aún existe
    const userExists = await userRepository.verifyUserExists(decoded.userId, decoded.email);
    if (!userExists) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Validar nueva contraseña
    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await userRepository.updatePassword(decoded.userId, hashedPassword);

    return true;
  }

  // Verificar token (para middleware)
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }
}

module.exports = new AuthService();
