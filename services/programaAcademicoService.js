const programaAcademicoRepository = require('../repositories/programaAcademicoRepository');

class ProgramaAcademicoService {
  // Obtener todos los programas académicos
  async getAllProgramas() {
    const programas = await programaAcademicoRepository.findAll();
    return programas;
  }

  // Obtener programa por ID
  async getProgramaById(id) {
    const programa = await programaAcademicoRepository.findById(id);
    if (!programa) {
      throw new Error('Programa académico no encontrado');
    }
    return programa;
  }

  // Verificar que el programa existe
  async verifyProgramaExists(id) {
    return await programaAcademicoRepository.exists(id);
  }
}

module.exports = new ProgramaAcademicoService();

