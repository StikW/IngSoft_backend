const programaAcademicoService = require('../services/programaAcademicoService');
const facultadService = require('../services/facultadService');

// Obtener todos los programas académicos
const getAllPrograms = async (req, res) => {
  try {
    const programas = await programaAcademicoService.getAllProgramas();

    res.status(200).json({
      success: true,
      data: {
        programs: programas
      }
    });

  } catch (error) {
    console.error('Error obteniendo programas académicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener todas las facultades
const getAllFaculties = async (req, res) => {
  try {
    const facultades = await facultadService.getAllFacultades();

    res.status(200).json({
      success: true,
      data: {
        faculties: facultades
      }
    });

  } catch (error) {
    console.error('Error obteniendo facultades:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllPrograms,
  getAllFaculties
};

