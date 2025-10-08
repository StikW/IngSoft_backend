/*const express = require('express');
const router = express.Router();
const { register, login, verifyToken, getCurrentUser, updateProfile, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const { validateUserData, validateUserRegistrationData, validateUserProfileData, validateForgotPasswordData, validateResetPasswordData } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// HU3.1 - Registro de usuarios
// POST /api/auth/register
router.post('/register', validateUserRegistrationData, register);

// HU3.2 - Login de usuarios
// POST /api/auth/login
router.post('/login', validateUserData, login);

// Verificar token válido
// GET /api/auth/verify
router.get('/verify', authenticateToken, verifyToken);

// Obtener información del usuario actual
// GET /api/auth/me
router.get('/me', authenticateToken, getCurrentUser);

// HU3.3 - Edición de perfil de usuario
// PUT /api/auth/profile
router.put('/profile', authenticateToken, validateUserProfileData, updateProfile);

// HU3.4 - Recuperación de credenciales
// POST /api/auth/forgot-password
router.post('/forgot-password', validateForgotPasswordData, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateResetPasswordData, resetPassword);

// HU3.5 - Cierre de sesión
// POST /api/auth/logout
router.post('/logout', authenticateToken, logout);

module.exports = router;
*/

const express = require("express");
const router = express.Router();
const { register } = require("../controllers/authController");

// Temporalmente SIN middlewares de validación
router.post("/register", register);

module.exports = router;


// HU3.2 - Login de usuarios
// POST /api/auth/login
router.post('/login', validateUserData, login);
