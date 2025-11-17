const express = require('express');
const router = express.Router();
const { getAllLugares, getLugarById } = require('../controllers/lugarController');
const { authenticateToken } = require('../middleware/auth');

// Obtener todos los lugares
// GET /api/lugares
router.get('/', authenticateToken, getAllLugares);

// Obtener lugar por ID
// GET /api/lugares/:id
router.get('/:id', authenticateToken, getLugarById);

module.exports = router;

