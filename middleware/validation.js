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

  if (!contrasena || contrasena.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
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
    errors.push('El teléfono debe tener al menos 7 dígitos');
  }

  // Validar que el teléfono solo contenga números
  if (telefono && !/^[0-9]+$/.test(telefono)) {
    errors.push('El teléfono solo puede contener números');
  }

  // Validar que se proporcione un certificado PDF
  if (!req.file) {
    errors.push('El certificado PDF es obligatorio');
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

  // Validar que se proporcione lugar_id
  if (!req.body.lugar_id) {
    errors.push('El lugar es obligatorio');
  }

  // Validar capacidad esperada
  if (!req.body.capacidad_esperada) {
    errors.push('La capacidad esperada es obligatoria');
  } else if (isNaN(req.body.capacidad_esperada) || parseInt(req.body.capacidad_esperada) <= 0) {
    errors.push('La capacidad esperada debe ser un número mayor a 0');
  }

  // Validar que se proporcione unidad académica
  if (!req.body.unidad_academica_id) {
    errors.push('La unidad académica es obligatoria');
  }

  // Validar que se proporcione al menos una organización externa
  let organizaciones_externas_ids = req.body.organizaciones_externas_ids;
  
  // Si viene como string separado por comas, convertirlo a array
  if (typeof organizaciones_externas_ids === 'string') {
    organizaciones_externas_ids = organizaciones_externas_ids.split(',').filter(id => id.trim() !== '');
  }
  
  if (!organizaciones_externas_ids || organizaciones_externas_ids.length === 0) {
    errors.push('Debe seleccionar al menos una organización externa');
  }

  // Validar que se proporcione el acta de comité PDF obligatorio
  if (!req.files || !req.files.acta_comite_pdf) {
    errors.push('El acta de comité PDF es obligatorio');
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
  const { correo, contrasena, nombre, telefono, programa_academico_id, facultad_id, rol_id } = req.body;
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

  if (!contrasena || contrasena.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  // Validar que la contraseña no contenga espacios
  if (contrasena && contrasena.includes(' ')) {
    errors.push('La contraseña no puede contener espacios');
  }

  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  // Validar según el rol
  const parsedRolId = parseInt(rol_id);
  if (parsedRolId === 1) {
    // Estudiante: programa_academico_id obligatorio, facultad_id no debe venir
    if (!programa_academico_id) {
      errors.push('El programa académico es obligatorio para estudiantes');
    }
    if (facultad_id) {
      errors.push('Los estudiantes no pueden tener facultad asignada');
    }
  } else if (parsedRolId === 2) {
    // Docente: facultad_id obligatorio, programa_academico_id no debe venir
    if (!facultad_id) {
      errors.push('La facultad es obligatoria para docentes');
    }
    if (programa_academico_id) {
      errors.push('Los docentes no pueden tener programa académico asignado');
    }
  }
  // Para secretarios y administradores, ambos deben ser NULL (no se validan aquí porque no se registran)

  if (!telefono || telefono.trim().length === 0) {
    errors.push('El número de teléfono es obligatorio');
  }

  // Validar que el teléfono solo contenga números y tenga longitud mínima
  if (telefono && !/^[0-9]+$/.test(telefono)) {
    errors.push('El teléfono solo puede contener números');
  }

  if (telefono && telefono.length < 7) {
    errors.push('El teléfono debe tener al menos 7 dígitos');
  }

  // Validar que el rol sea válido y NO sea administrador (rol_id = 4) o secretario (rol_id = 3)
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
  const { nombre, telefono } = req.body;
  const errors = [];

  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre es requerido y debe tener al menos 2 caracteres');
  }

  if (nombre && nombre.trim().length > 100) {
    errors.push('El nombre no puede tener más de 100 caracteres');
  }

  // Validar teléfono si se proporciona
  if (telefono !== undefined) {
    if (!telefono || telefono.trim().length === 0) {
      errors.push('El número de teléfono es obligatorio');
    } else {
      // Validar que el teléfono solo contenga números
      if (!/^[0-9]+$/.test(telefono)) {
        errors.push('El teléfono solo puede contener números');
      }
      
      if (telefono.length < 7) {
        errors.push('El teléfono debe tener al menos 7 dígitos');
      }
    }
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

  if (!newPassword || newPassword.length < 8) {
    errors.push('La nueva contraseña debe tener al menos 8 caracteres');
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

// Middleware para validar datos de actualización de evento (campos opcionales, sin exigir PDFs)
const validateEventUpdateData = (req, res, next) => {
  const { titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar_id, capacidad_esperada, organizaciones_externas_ids } = req.body;
  const errors = [];

  // Validar solo si vienen los campos
  if (titulo !== undefined && titulo.trim().length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  }
  if (descripcion !== undefined && descripcion.trim().length < 3) {
    errors.push('La descripción debe tener al menos 3 caracteres');
  }
  if (tipo !== undefined && !['academico', 'ludico'].includes(tipo)) {
    errors.push('El tipo debe ser "academico" o "ludico"');
  }
  if (lugar_id !== undefined && !lugar_id) {
    errors.push('El lugar es obligatorio');
  }
  if (capacidad_esperada !== undefined && (isNaN(capacidad_esperada) || parseInt(capacidad_esperada) <= 0)) {
    errors.push('La capacidad esperada debe ser un número mayor a 0');
  }

  // Validar fechas si vienen y su relación
  if (fecha_inicio && fecha_fin && new Date(fecha_inicio) >= new Date(fecha_fin)) {
    errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  // Validar organizaciones si vienen
  let orgIds = organizaciones_externas_ids;
  if (typeof orgIds === 'string') {
    orgIds = orgIds.split(',').filter(id => id.trim() !== '');
  }
  if (orgIds !== undefined && (!Array.isArray(orgIds) || orgIds.length === 0)) {
    errors.push('Debe seleccionar al menos una organización externa');
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
  validateEventUpdateData,
  validateEventCreationData
};

