const express = require('express');
const router = express.Router();
const {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus,
  getAllAcademicUnits,
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
router.post('/', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), upload.fields([
  { name: 'acta_comite_pdf', maxCount: 1 }
]), validateEventData, createEvent);

// Obtener eventos por estado (con paginación)
// GET /api/events?estado=borrador&page=1&limit=10
router.get('/', authenticateToken, getEventsByStatus);

// Obtener todas las unidades académicas
// GET /api/events/academic-units
router.get('/academic-units', authenticateToken, getAllAcademicUnits);

// HU1.4 - Obtener eventos del organizador (Mis eventos)
// GET /api/events/my-events?estado=borrador&titulo=evento&page=1&limit=10
router.get('/my-events', authenticateToken, getMyEvents);

// Obtener evento por ID
// GET /api/events/:id
router.get('/:id', authenticateToken, getEventById);

// HU1.2 - Edición de evento antes de validación
// PUT /api/events/:id
router.put('/:id', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), upload.fields([
  { name: 'acta_comite_pdf', maxCount: 1 }
]), validateEventUpdateData, updateEvent);

// HU1.5 - Envío de evento a validación/aprobación
// POST /api/events/:id/submit-validation
router.post('/:id/submit-validation', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), submitEventForValidation);

// HU4.1 - Aprobar evento
// POST /api/events/:id/approve
router.post('/:id/approve', authenticateToken, requireRole(['secretario', 'administrador']), approveEvent);

// HU4.1 - Rechazar evento
// POST /api/events/:id/reject
router.post('/:id/reject', authenticateToken, requireRole(['secretario', 'administrador']), rejectEvent);

// HU1.3 - Eliminar evento
// DELETE /api/events/:id
router.delete('/:id', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), deleteEvent);

module.exports = router;

