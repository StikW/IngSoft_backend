const { executeQuery } = require('../db');

class ProgramaAcademicoRepository {
  // Obtener todos los programas académicos
  async findAll() {
    const query = 'SELECT * FROM programas_academicos ORDER BY nombre ASC';
    const programas = await executeQuery(query);
    return programas;
  }

  // Buscar programa por ID
  async findById(id) {
    const query = 'SELECT * FROM programas_academicos WHERE id = ?';
    const [programa] = await executeQuery(query, [id]);
    return programa;
  }

  // Verificar que el programa existe
  async exists(id) {
    const query = 'SELECT id FROM programas_academicos WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }
}

module.exports = new ProgramaAcademicoRepository();

