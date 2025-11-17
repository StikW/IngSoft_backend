const express = require('express');
const router = express.Router();
const { getAllPrograms, getAllFaculties } = require('../controllers/academicController');

// Obtener todos los programas académicos (público para registro)
// GET /api/academic/programs
router.get('/programs', getAllPrograms);

// Obtener todas las facultades (público para registro)
// GET /api/academic/faculties
router.get('/faculties', getAllFaculties);

module.exports = router;

