const organizationRepository = require('../repositories/organizationRepository');

class OrganizationService {
  // Crear nueva organización
  async createOrganization(organizationData) {
    const {
      nombre,
      representante_legal,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf
    } = organizationData;

    // Verificar si ya existe una organización con el mismo nombre
    const nameExists = await organizationRepository.existsByName(nombre);
    if (nameExists) {
      throw new Error('Ya existe una organización con ese nombre');
    }

    // Crear la organización
    const organizationId = await organizationRepository.create({
      nombre,
      representante_legal,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf
    });

    // Obtener la organización creada
    const newOrganization = await organizationRepository.findById(organizationId);
    return newOrganization;
  }

  // Buscar organizaciones por nombre
  async searchOrganizations(nombre) {
    const organizations = await organizationRepository.searchByName(nombre);
    return {
      organizations,
      total: organizations.length
    };
  }

  // Obtener organización por ID
  async getOrganizationById(organizationId) {
    const organization = await organizationRepository.findById(organizationId);
    
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    return organization;
  }

  // Actualizar organización
  async updateOrganization(organizationId, updateData) {
    // Verificar que la organización existe
    const organizationExists = await organizationRepository.exists(organizationId);
    if (!organizationExists) {
      throw new Error('Organización no encontrada');
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (updateData.nombre) {
      const nameExists = await organizationRepository.existsByNameExcludingId(
        updateData.nombre, 
        organizationId
      );
      if (nameExists) {
        throw new Error('Ya existe una organización con ese nombre');
      }
    }

    // Actualizar la organización
    await organizationRepository.update(organizationId, updateData);

    // Obtener la organización actualizada
    const updatedOrganization = await organizationRepository.findById(organizationId);
    return updatedOrganization;
  }

  // Obtener todas las organizaciones con paginación
  async getAllOrganizations(page = 1, limit = 10) {
    // Validar parámetros
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

    const result = await organizationRepository.findAll(validPage, validLimit);
    return result;
  }

  // Eliminar organización (solo secretarios y administradores)
  async deleteOrganization(organizationId) {
    // Verificar que la organización existe
    const existingOrganization = await organizationRepository.findById(organizationId);
    if (!existingOrganization) {
      throw new Error('Organización no encontrada');
    }

    // Eliminar la organización
    const deleted = await organizationRepository.delete(organizationId);
    if (!deleted) {
      throw new Error('Error al eliminar la organización');
    }

    return { success: true, message: 'Organización eliminada exitosamente' };
  }
}

module.exports = new OrganizationService();
