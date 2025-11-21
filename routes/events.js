const express = require('express');
const router = express.Router();
const {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus,
  getAllAcademicUnits,
  getUsersByRole,
  getMyEvents,
  approveEvent,
  rejectEvent,
  deleteEvent
} = require('../controllers/eventController');
const { validateEventData, validateEventCreationData, validateEventUpdateData } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// HU1.1 - Registro de evento
// POST /api/events
// Solo organizadores (estudiantes y docentes) pueden crear eventos
// Configurar multer para aceptar acta_comite_pdf y múltiples avales con nombres dinámicos
const uploadEventFiles = upload.fields([
  { name: 'acta_comite_pdf', maxCount: 1 }
  // Los avales se manejarán dinámicamente en el controlador
]);

// Middleware personalizado para manejar avales dinámicos
const handleAvalFiles = (req, res, next) => {
  // Multer ya procesó acta_comite_pdf, ahora necesitamos procesar los avales
  // Los avales vienen como aval_0_pdf, aval_1_pdf, etc.
  // Usaremos upload.any() o procesaremos manualmente
  next();
};

router.post('/', authenticateToken, requireRole(['estudiante', 'docente']), upload.any(), validateEventData, createEvent);

// Obtener eventos por estado (con paginación)
// GET /api/events?estado=borrador&page=1&limit=10
router.get('/', authenticateToken, getEventsByStatus);

// Obtener todas las unidades académicas
// GET /api/events/academic-units
router.get('/academic-units', authenticateToken, getAllAcademicUnits);

// Obtener usuarios por rol (para seleccionar responsables)
// GET /api/events/users-by-role?rol_id=1 (1=estudiante, 2=docente)
router.get('/users-by-role', authenticateToken, getUsersByRole);

// HU1.4 - Obtener eventos del organizador (Mis eventos)
// GET /api/events/my-events?estado=borrador&titulo=evento&page=1&limit=10
router.get('/my-events', authenticateToken, getMyEvents);

// Obtener evento por ID
// GET /api/events/:id
router.get('/:id', authenticateToken, getEventById);

// HU1.2 - Edición de evento antes de validación
// PUT /api/events/:id
// Solo organizadores (estudiantes y docentes) pueden editar eventos
router.put('/:id', authenticateToken, requireRole(['estudiante', 'docente']), upload.fields([
  { name: 'acta_comite_pdf', maxCount: 1 }
]), validateEventUpdateData, updateEvent);

// HU1.5 - Envío de evento a validación/aprobación
// POST /api/events/:id/submit-validation
// Solo organizadores (estudiantes y docentes) pueden enviar eventos a validación
router.post('/:id/submit-validation', authenticateToken, requireRole(['estudiante', 'docente']), submitEventForValidation);

// HU4.1 - Aprobar evento
// POST /api/events/:id/approve
router.post('/:id/approve', authenticateToken, requireRole(['secretario', 'administrador']), approveEvent);

// HU4.1 - Rechazar evento
// POST /api/events/:id/reject
router.post('/:id/reject', authenticateToken, requireRole(['secretario', 'administrador']), rejectEvent);

// HU1.3 - Eliminar evento
// DELETE /api/events/:id
// Solo organizadores (estudiantes y docentes) pueden eliminar eventos
router.delete('/:id', authenticateToken, requireRole(['estudiante', 'docente']), deleteEvent);

module.exports = router;

