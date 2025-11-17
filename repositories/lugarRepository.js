const { executeQuery } = require('../db');

class LugarRepository {
  // Obtener todos los lugares
  async findAll() {
    const query = 'SELECT * FROM lugares ORDER BY nombre ASC';
    const lugares = await executeQuery(query);
    return lugares;
  }

  // Buscar lugar por ID
  async findById(id) {
    const query = 'SELECT * FROM lugares WHERE id = ?';
    const [lugar] = await executeQuery(query, [id]);
    return lugar;
  }

  // Verificar que el lugar existe
  async exists(id) {
    const query = 'SELECT id FROM lugares WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }
}

module.exports = new LugarRepository();

