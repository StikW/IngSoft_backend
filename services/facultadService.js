const facultadRepository = require('../repositories/facultadRepository');

class FacultadService {
  // Obtener todas las facultades
  async getAllFacultades() {
    const facultades = await facultadRepository.findAll();
    return facultades;
  }

  // Obtener facultad por ID
  async getFacultadById(id) {
    const facultad = await facultadRepository.findById(id);
    if (!facultad) {
      throw new Error('Facultad no encontrada');
    }
    return facultad;
  }

  // Verificar que la facultad existe
  async verifyFacultadExists(id) {
    return await facultadRepository.exists(id);
  }
}

module.exports = new FacultadService();

