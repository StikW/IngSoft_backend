// Middleware para validar datos de entrada
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar dominio institucional
const validateInstitutionalEmail = (email) => {
  const institutionalDomain = '@uao.edu.co';
  return email.toLowerCase().endsWith(institutionalDomain);
};

const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return missing;
};

// Middleware para validar datos de usuario (login)
const validateUserData = (req, res, next) => {
  const { correo, contrasena } = req.body;
  const errors = [];

  if (!correo || !validateEmail(correo)) {
    errors.push('Correo inválido');
  }

  if (!contrasena || contrasena.length < 4) {
    errors.push('La contraseña debe tener al menos 4 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar datos de organización
const validateOrganizationData = (req, res, next) => {
  const { nombre, representante_legal, telefono, ubicacion } = req.body;
  const errors = [];

  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  if (!representante_legal || representante_legal.trim().length < 2) {
    errors.push('El representante legal es requerido');
  }

  if (telefono && telefono.length < 7) {
    errors.push('Teléfono inválido');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de organización inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar datos de evento
const validateEventData = (req, res, next) => {
  const { titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar } = req.body;
  const errors = [];

  if (!titulo || titulo.trim().length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  }

  if (!descripcion || descripcion.trim().length < 3) {
    errors.push('La descripción debe tener al menos 3 caracteres');
  }

  if (!tipo || !['academico', 'ludico'].includes(tipo)) {
    errors.push('El tipo debe ser "academico" o "ludico"');
  }

  if (!fecha_inicio) {
    errors.push('La fecha de inicio es requerida');
  }

  if (!fecha_fin) {
    errors.push('La fecha de fin es requerida');
  }

  if (fecha_inicio && fecha_fin && new Date(fecha_inicio) >= new Date(fecha_fin)) {
    errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  if (!lugar || lugar.trim().length < 3) {
    errors.push('El lugar debe tener al menos 3 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de evento inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar datos de registro de usuario
const validateUserRegistrationData = (req, res, next) => {
  const { correo, contrasena, nombre, telefono, rol_id } = req.body;
  const errors = [];

  if (!correo || !validateEmail(correo)) {
    errors.push('Correo inválido');
  }

  // Validar dominio institucional
  if (correo && !validateInstitutionalEmail(correo)) {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten correos electrónicos institucionales (@uao.edu.co)',
      errors: ['El correo debe pertenecer al dominio institucional @uao.edu.co']
    });
  }

  if (!contrasena || contrasena.length < 4) {
    errors.push('La contraseña debe tener al menos 4 caracteres');
  }

  // Validar que la contraseña no contenga espacios
  if (contrasena && contrasena.includes(' ')) {
    errors.push('La contraseña no puede contener espacios');
  }

  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  if (!telefono || telefono.trim().length === 0) {
    errors.push('El número de teléfono es obligatorio');
  }

  // Validar que el rol sea válido y NO sea administrador (rol_id = 4) o secretario (rol_id = 3)
  const parsedRolId = parseInt(rol_id);
  if (!rol_id || ![1, 2].includes(parsedRolId)) {
    errors.push('Rol inválido. Solo se permiten registros para: Estudiante (1) o Docente (2). Los secretarios y administradores están preconfigurados.');
  }

  // Rechazar explícitamente el registro de secretarios
  if (parsedRolId === 3) {
    return res.status(403).json({
      success: false,
      message: 'No se permiten registros de secretarios académicos. Los secretarios están preconfigurados en el sistema.',
      errors: ['El rol de secretario académico no está disponible para registro público']
    });
  }

  // Rechazar explícitamente el registro de administradores
  if (parsedRolId === 4) {
    return res.status(403).json({
      success: false,
      message: 'No se permiten registros de administradores. Los administradores están preconfigurados en el sistema.',
      errors: ['El rol de administrador no está disponible para registro público']
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de registro inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar datos de actualización de perfil de usuario
const validateUserProfileData = (req, res, next) => {
  const { nombre } = req.body;
  const errors = [];

  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre es requerido y debe tener al menos 2 caracteres');
  }

  if (nombre && nombre.trim().length > 100) {
    errors.push('El nombre no puede tener más de 100 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de perfil inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar solicitud de recuperación de contraseña
const validateForgotPasswordData = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  if (!email || !validateEmail(email)) {
    errors.push('Email inválido');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Email requerido',
      errors
    });
  }

  next();
};

// Middleware para validar restablecimiento de contraseña
const validateResetPasswordData = (req, res, next) => {
  const { token, newPassword } = req.body;
  const errors = [];

  if (!token || token.trim().length === 0) {
    errors.push('Token requerido');
  }

  if (!newPassword || newPassword.length < 6) {
    errors.push('La nueva contraseña debe tener al menos 6 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de restablecimiento inválidos',
      errors
    });
  }

  next();
};

// Middleware para validar datos de creación de evento
const validateEventCreationData = (req, res, next) => {
  const { titulo, descripcion, fecha_inicio, fecha_fin, ubicacion, capacidad_maxima, costo_entrada } = req.body;
  const errors = [];

  if (!titulo || titulo.trim().length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  }

  if (!descripcion || descripcion.trim().length < 10) {
    errors.push('La descripción debe tener al menos 10 caracteres');
  }

  if (!fecha_inicio) {
    errors.push('La fecha de inicio es requerida');
  }

  if (!fecha_fin) {
    errors.push('La fecha de fin es requerida');
  }

  if (fecha_inicio && fecha_fin && new Date(fecha_inicio) >= new Date(fecha_fin)) {
    errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  if (!ubicacion || ubicacion.trim().length < 3) {
    errors.push('La ubicación debe tener al menos 3 caracteres');
  }

  if (capacidad_maxima !== undefined && (isNaN(capacidad_maxima) || capacidad_maxima < 1)) {
    errors.push('La capacidad máxima debe ser un número mayor a 0');
  }

  if (costo_entrada !== undefined && (isNaN(costo_entrada) || costo_entrada < 0)) {
    errors.push('El costo de entrada debe ser un número mayor o igual a 0');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de evento inválidos',
      errors
    });
  }

  next();
};

module.exports = {
  validateEmail,
  validateInstitutionalEmail,
  validateRequired,
  validateUserData,
  validateUserRegistrationData,
  validateUserProfileData,
  validateForgotPasswordData,
  validateResetPasswordData,
  validateOrganizationData,
  validateEventData,
  validateEventCreationData
};

