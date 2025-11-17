const authService = require("../services/authService");

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

    const result = await authService.login(correo, contrasena);

    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: result,
    });
  } catch (error) {
    console.error("Error en login:", error);
    const statusCode = error.message.includes('no encontrado') || error.message.includes('incorrecta') ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
const getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      message: error.message 
    });
  }
};



// HU3.1 - Registro de usuarios
const register = async (req, res) => {
  console.log("📥 Llegó al controlador /api/auth/register");
  console.log("🧾 Body recibido:", req.body);
  console.log("🧾 Headers:", req.headers);
  console.log("🧾 Content-Type:", req.get('Content-Type'));

  try {
    const { nombre, correo, contrasena, telefono, programa_academico_id, facultad_id, rol_id } = req.body;
    console.log("📋 Datos extraídos:", { nombre, correo, contrasena, telefono, programa_academico_id, facultad_id, rol_id });

    // Verifica campos requeridos básicos
    if (!nombre || !correo || !contrasena || !telefono || !rol_id) {
      console.log("❌ Faltan datos:", { nombre: !!nombre, correo: !!correo, contrasena: !!contrasena, telefono: !!telefono, programa_academico_id: !!programa_academico_id, facultad_id: !!facultad_id, rol_id: !!rol_id });
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos",
        received: { nombre, correo, contrasena, telefono, programa_academico_id, facultad_id, rol_id }
      });
    }

    const result = await authService.register({ nombre, correo, contrasena, telefono, programa_academico_id, facultad_id, rol_id });

    console.log("✅ Usuario registrado correctamente");

    return res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: result,
    });
  } catch (error) {
    console.error("💥 Error en register:", error);
    const statusCode = error.message.includes('Ya existe') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};




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

// HU3.3 - Edición de perfil de usuario
const updateProfile = async (req, res) => {
  try {
    const { nombre, telefono, nuevaContrasena } = req.body;
    const userId = req.user.id;

    const updatedUser = await authService.updateProfile(userId, { nombre, telefono, nuevaContrasena });

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    const statusCode = error.message.includes('requerido') ? 400 : 
                      error.message.includes('no encontrado') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU3.4 - Recuperación de credenciales
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.generatePasswordResetToken(email);

    // Por seguridad, siempre devolver éxito aunque el email no exista
    const response = {
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña'
    };

    // En desarrollo, incluir el token para testing
    if (process.env.NODE_ENV === 'development' && result) {
      response.resetToken = result.token;
      console.log(`🔗 Enlace de recuperación para ${result.user.correo}: ${result.token}`);
    }

    res.status(200).json(response);

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

    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    const statusCode = error.message.includes('Token') || error.message.includes('requeridos') || 
                      error.message.includes('caracteres') || error.message.includes('no encontrado') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
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

