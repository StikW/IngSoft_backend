const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { executeQuery } = require("../db");

// ==================================================
// 🟢 LOGIN — HU3.2 Autenticación de usuarios
// ==================================================
const login = async (req, res) => {
  console.log("📥 Llegó al controlador /api/auth/login");
  console.log("🧾 Body recibido:", req.body);
  console.log("🧾 Headers:", req.headers);
  console.log("🧾 Content-Type:", req.get('Content-Type'));

  try {
    const { correo, contrasena } = req.body;
    console.log("📋 Datos extraídos:", { correo, contrasena });

    // 1️⃣ Buscar usuario con su rol
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.contrasena,
        u.rol_id,
        r.nombre as rol_nombre,
        u.activo
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.correo = ? AND u.activo = 1
      LIMIT 1;
    `;

    const [user] = await executeQuery(query, [correo]);

    if (!user) {
      console.log("❌ Usuario no encontrado:", correo);
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado o inactivo",
      });
    }

    // 2️⃣ Verificar contraseña con bcrypt
    const validPassword = await bcrypt.compare(contrasena, user.contrasena);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    // 3️⃣ Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.correo,
        rol: user.rol_nombre,
      },
      process.env.JWT_SECRET || "clave_secreta",
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // 4️⃣ Respuesta exitosa
    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          correo: user.correo,
          rol: user.rol_nombre,
          rol_id: user.rol_id,
        },
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
const getCurrentUser = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.rol_id,
        r.nombre as rol_nombre,
        u.activo
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `;
    const [user] = await executeQuery(query, [req.user.userId]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};



// HU3.1 - Registro de usuarios


const register = async (req, res) => {
  console.log("📥 Llegó al controlador /api/auth/register");
  console.log("🧾 Body recibido:", req.body);
  console.log("🧾 Headers:", req.headers);
  console.log("🧾 Content-Type:", req.get('Content-Type'));

  try {
    const { nombre, correo, contrasena, rol_id } = req.body;
    console.log("📋 Datos extraídos:", { nombre, correo, contrasena, rol_id });

    // Verifica campos requeridos
    if (!nombre || !correo || !contrasena || !rol_id) {
      console.log("❌ Faltan datos:", { nombre: !!nombre, correo: !!correo, contrasena: !!contrasena, rol_id: !!rol_id });
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos",
        received: { nombre, correo, contrasena, rol_id }
      });
    }

    // Verificar si el correo ya existe
    const checkEmail = `SELECT id FROM usuarios WHERE correo = ?`;
    const existingUser = await executeQuery(checkEmail, [correo]);
    
    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un usuario con ese correo",
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear el usuario
    const insertUser = `
      INSERT INTO usuarios (nombre, correo, contrasena, rol_id, activo)
      VALUES (?, ?, ?, ?, 1)
    `;
    const userResult = await executeQuery(insertUser, [nombre, correo, hashedPassword, rol_id]);
    const userId = userResult.insertId;

    console.log("✅ Usuario registrado correctamente");

    return res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        id: userId,
        nombre,
        correo,
        rol_id,
      },
    });
  } catch (error) {
    console.error("💥 Error en register:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = { register };




// ==================================================
// 🟣 VERIFICAR TOKEN
// ==================================================
const verifyToken = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Token válido",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error("Error verificando token:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  login,
  register,
  verifyToken,
};

// HU3.3 - Edición de perfil de usuario
const updateProfile = async (req, res) => {
  try {
    const { nombre } = req.body;
    const userId = req.user.id;

    // Validar que se proporcionó al menos el nombre
    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido y debe tener al menos 2 caracteres'
      });
    }

    // Actualizar solo el nombre (correo y rol no se pueden cambiar)
    const updateQuery = `
      UPDATE usuarios 
      SET nombre = ?
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [nombre.trim(), userId]);

    // Obtener el usuario actualizado con su rol
    const updatedUserQuery = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.rol_id,
        r.nombre as rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `;
    const updatedUser = await executeQuery(updatedUserQuery, [userId]);

    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU3.4 - Recuperación de credenciales
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuario por email
    const userQuery = 'SELECT id, correo, nombre FROM usuarios WHERE correo = ? AND activo = 1';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      // Por seguridad, siempre devolver éxito aunque el email no exista
      return res.status(200).json({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña'
      });
    }

    const user = users[0];

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

    // Guardar token en la base de datos (opcional, para invalidar tokens usados)
    // Por simplicidad, usaremos solo el token JWT

    // En un entorno real, aquí enviarías un email con el enlace de recuperación
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    console.log(`🔗 Enlace de recuperación para ${user.correo}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña',
      // En desarrollo, incluir el token para testing
      ...(process.env.NODE_ENV === 'development' && {
        resetToken: resetToken
      })
    });

  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    // Verificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'El token de recuperación ha expirado'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Token de recuperación inválido'
      });
    }

    // Verificar que es un token de recuperación
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Verificar que el usuario aún existe
    const userQuery = 'SELECT id FROM usuarios WHERE id = ? AND correo = ? AND activo = 1';
    const users = await executeQuery(userQuery, [decoded.userId, decoded.email]);

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Validar nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    const updateQuery = `
      UPDATE usuarios 
      SET contrasena = ?
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [hashedPassword, decoded.userId]);

    res.status(200).json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU3.5 - Cierre de sesión
const logout = async (req, res) => {
  try {
    // Con JWT sin estado, el logout se maneja principalmente en el frontend
    // eliminando el token del almacenamiento local/session
    
    // Opcionalmente, podríamos mantener una blacklist de tokens en la base de datos
    // pero para simplificar, solo confirmamos el logout
    
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  logout
};

