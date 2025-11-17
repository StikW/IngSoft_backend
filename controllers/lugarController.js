const lugarService = require('../services/lugarService');

// Obtener todos los lugares
const getAllLugares = async (req, res) => {
  try {
    const lugares = await lugarService.getAllLugares();

    res.status(200).json({
      success: true,
      data: {
        lugares
      }
    });

  } catch (error) {
    console.error('Error obteniendo lugares:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener lugar por ID
const getLugarById = async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await lugarService.getLugarById(id);

    res.status(200).json({
      success: true,
      data: {
        lugar
      }
    });

  } catch (error) {
    console.error('Error obteniendo lugar:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllLugares,
  getLugarById
};

