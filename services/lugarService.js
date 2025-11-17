const lugarRepository = require('../repositories/lugarRepository');

class LugarService {
  // Obtener todos los lugares
  async getAllLugares() {
    const lugares = await lugarRepository.findAll();
    return lugares;
  }

  // Obtener lugar por ID
  async getLugarById(id) {
    const lugar = await lugarRepository.findById(id);
    if (!lugar) {
      throw new Error('Lugar no encontrado');
    }
    return lugar;
  }

  // Verificar que el lugar existe
  async verifyLugarExists(id) {
    return await lugarRepository.exists(id);
  }
}

module.exports = new LugarService();

