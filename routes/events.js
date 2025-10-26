const express = require('express');
const router = express.Router();
const {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus,
  getAllAcademicUnits,
  getMyEvents
} = require('../controllers/eventController');
const { validateEventData, validateEventCreationData } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');

// HU1.1 - Registro de evento
// POST /api/events
router.post('/', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), validateEventData, createEvent);

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
router.put('/:id', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), validateEventData, updateEvent);

// HU1.5 - Envío de evento a validación/aprobación
// POST /api/events/:id/submit-validation
router.post('/:id/submit-validation', authenticateToken, requireRole(['estudiante', 'docente', 'secretario', 'administrador']), submitEventForValidation);

module.exports = router;

