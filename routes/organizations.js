const express = require('express');
const router = express.Router();
const {
  createOrganization,
  searchOrganizations,
  getOrganizationById,
  updateOrganization,
  getAllOrganizations,
  deleteOrganization
} = require('../controllers/organizationController');
const { validateOrganizationData } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// HU2.1 - Registro de organización externa
// POST /api/organizations
// Solo organizadores (estudiantes y docentes) pueden crear organizaciones externas
router.post('/', authenticateToken, requireRole(['estudiante', 'docente']), upload.single('certificado_pdf'), validateOrganizationData, createOrganization);

// HU2.2 - Búsqueda de organización externa (con filtro por nombre)
// GET /api/organizations/search
router.get('/search', authenticateToken, searchOrganizations);

// Obtener todas las organizaciones (con paginación)
// GET /api/organizations
router.get('/', authenticateToken, getAllOrganizations);

// HU2.3 - Visualización de datos de organización externa por ID
// GET /api/organizations/:id
router.get('/:id', authenticateToken, getOrganizationById);

// HU2.4 - Edición de organización externa
// PUT /api/organizations/:id
// Solo organizadores (estudiantes y docentes) pueden editar organizaciones externas
router.put('/:id', authenticateToken, requireRole(['estudiante', 'docente']), upload.single('certificado_pdf'), validateOrganizationData, updateOrganization);

// HU2.5 - Eliminación de organización externa
// DELETE /api/organizations/:id
// Solo organizadores (estudiantes y docentes) pueden eliminar organizaciones externas
router.delete('/:id', authenticateToken, requireRole(['estudiante', 'docente']), deleteOrganization);

module.exports = router;