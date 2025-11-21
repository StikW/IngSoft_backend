const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const emailService = require('./emailService');

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
        programa_id: user.programa_id,
        programa_nombre: user.programa_nombre,
        facultad_id: user.facultad_id,
        facultad_nombre: user.facultad_nombre,
        rol: user.rol_nombre,
        rol_id: user.rol_id,
      }
    };
  }

  // Registrar nuevo usuario
  async register(userData) {
    const { nombre, correo, contrasena, telefono, programa_academico_id, facultad_id, rol_id } = userData;

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

    // Validaciones según el rol
    if (parsedRolId === 1) {
      // Estudiante: programa_academico_id obligatorio, facultad_id debe ser NULL
      if (!programa_academico_id) {
        throw new Error('El programa académico es obligatorio para estudiantes');
      }
      if (facultad_id) {
        throw new Error('Los estudiantes no pueden tener facultad asignada');
      }
    } else if (parsedRolId === 2) {
      // Docente: facultad_id obligatorio, programa_academico_id debe ser NULL
      if (!facultad_id) {
        throw new Error('La facultad es obligatoria para docentes');
      }
      if (programa_academico_id) {
        throw new Error('Los docentes no pueden tener programa académico asignado');
      }
    }

    // Verificar si el correo ya existe
    const emailExists = await userRepository.existsByEmail(correo);
    if (emailExists) {
      throw new Error('Ya existe un usuario con ese correo');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear el usuario (convertir programa_academico_id del request a programa_id para la BD)
    const userId = await userRepository.create({
      nombre,
      correo,
      contrasena: hashedPassword,
      telefono,
      programa_id: programa_academico_id ? parseInt(programa_academico_id) : null,
      facultad_id: facultad_id ? parseInt(facultad_id) : null,
      rol_id
    });

    // Obtener el usuario creado con información completa
    const newUser = await userRepository.findById(userId);
    
    // Enviar email de confirmación de registro
    try {
      await emailService.sendRegistrationConfirmation({
        nombre: newUser.nombre,
        correo: newUser.correo,
        rol: parsedRolId === 1 ? 'Estudiante' : 'Docente'
      });
      console.log('✅ Email de confirmación de registro enviado a:', newUser.correo);
    } catch (emailError) {
      // No fallar el registro si el email falla, solo loguear el error
      console.error('⚠️ Error enviando email de confirmación (registro continuó exitosamente):', emailError);
    }
    
    return {
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        correo: newUser.correo,
        telefono: newUser.telefono,
        rol_id: newUser.rol_id,
        programa_id: newUser.programa_id,
        programa_nombre: newUser.programa_nombre,
        facultad_id: newUser.facultad_id,
        facultad_nombre: newUser.facultad_nombre
      }
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
      if (nuevaContrasena.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
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

  // Recuperar credenciales (generar contraseña temporal y enviar por email)
  async recoverCredentials(email) {
    // Buscar usuario por email
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return null;
    }

    // Generar contraseña temporal aleatoria (12 caracteres)
    const generateTemporaryPassword = () => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    const temporaryPassword = generateTemporaryPassword();

    // Encriptar la nueva contraseña temporal
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Actualizar la contraseña en la base de datos
    await userRepository.updatePassword(user.id, hashedPassword);

    // Obtener información del rol para el email
    const rolNames = {
      1: 'Estudiante',
      2: 'Docente',
      3: 'Secretario',
      4: 'Administrador'
    };

    // Enviar email con las credenciales
    try {
      await emailService.sendCredentialsRecovery({
        nombre: user.nombre,
        correo: user.correo,
        rol: rolNames[user.rol_id] || 'Usuario'
      }, temporaryPassword);
      console.log('✅ Email de recuperación de credenciales enviado a:', user.correo);
    } catch (emailError) {
      console.error('❌ Error enviando email de recuperación:', emailError);
      throw new Error('Error al enviar email de recuperación de credenciales');
    }

    return {
      user: {
        id: user.id,
        correo: user.correo,
        nombre: user.nombre
      }
    };
  }

  // Generar token de recuperación de contraseña (método anterior, mantenido por compatibilidad)
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
