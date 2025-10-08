const express = require('express');
const router = express.Router();
const {
  createOrganization,
  searchOrganizations,
  getOrganizationById,
  updateOrganization,
  getAllOrganizations
} = require('../controllers/organizationController');
const { validateOrganizationData } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');

// HU2.1 - Registro de organización externa
// POST /api/organizations
router.post('/', authenticateToken, requireRole(['administrador', 'secretario']), validateOrganizationData, createOrganization);

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
router.put('/:id', authenticateToken, requireRole(['administrador', 'secretario']), validateOrganizationData, updateOrganization);

module.exports = router;

