const { executeQuery } = require('../db');

class FacultadRepository {
  // Obtener todas las facultades
  async findAll() {
    const query = 'SELECT * FROM facultades ORDER BY nombre ASC';
    const facultades = await executeQuery(query);
    return facultades;
  }

  // Buscar facultad por ID
  async findById(id) {
    const query = 'SELECT * FROM facultades WHERE id = ?';
    const [facultad] = await executeQuery(query, [id]);
    return facultad;
  }

  // Verificar que la facultad existe
  async exists(id) {
    const query = 'SELECT id FROM facultades WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }
}

module.exports = new FacultadRepository();

