const organizationRepository = require('../repositories/organizationRepository');
const { deleteFile } = require('../utils/fileUtils');

class OrganizationService {
  // Crear nueva organización
  async createOrganization(organizationData, creadorId) {
    const {
      nit,
      nombre,
      representante_legal,
      representante_asiste,
      representante_alterno_nombre,
      representante_alterno_contacto,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf
    } = organizationData;

    // Validar que si representante_asiste es false, se proporcione representante alterno
    // Parsear correctamente el valor que puede venir como boolean, string "true"/"false", o número
    const representanteAsiste = representante_asiste === true || 
                                representante_asiste === 'true' || 
                                representante_asiste === 1 || 
                                representante_asiste === '1';
    
    console.log('🔍 Validando representante:', {
      representante_asiste,
      tipo: typeof representante_asiste,
      representanteAsiste,
      nombreAlterno: representante_alterno_nombre,
      contactoAlterno: representante_alterno_contacto
    });
    
    if (!representanteAsiste) {
      // Verificar que los campos del representante alterno no estén vacíos o sean null/undefined
      const nombreAlterno = representante_alterno_nombre ? String(representante_alterno_nombre).trim() : '';
      const contactoAlterno = representante_alterno_contacto ? String(representante_alterno_contacto).trim() : '';
      
      console.log('🔍 Campos alternos procesados:', { nombreAlterno, contactoAlterno });
      
      if (!nombreAlterno || nombreAlterno === '') {
        throw new Error('Si el representante legal no asiste, debe proporcionar el nombre del representante alterno');
      }
      if (!contactoAlterno || contactoAlterno === '') {
        throw new Error('Si el representante legal no asiste, debe proporcionar el contacto del representante alterno');
      }
    }

    // Verificar si ya existe una organización con el mismo nombre
    const nameExists = await organizationRepository.existsByName(nombre);
    if (nameExists) {
      throw new Error('Ya existe una organización con ese nombre');
    }

    // Verificar si ya existe una organización con el mismo NIT
    const nitExists = await organizationRepository.existsByNit(nit);
    if (nitExists) {
      throw new Error('Ya existe una organización con ese NIT');
    }

    // Crear la organización
    const organizationId = await organizationRepository.create({
      nit,
      nombre,
      representante_legal,
      representante_asiste: representanteAsiste,
      representante_alterno_nombre: representanteAsiste ? null : representante_alterno_nombre,
      representante_alterno_contacto: representanteAsiste ? null : representante_alterno_contacto,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf,
      creador_id: creadorId
    });

    // Obtener la organización creada
    const newOrganization = await organizationRepository.findById(organizationId);
    return newOrganization;
  }

  // Buscar organizaciones por nombre o NIT
  async searchOrganizations(searchTerm) {
    const organizations = await organizationRepository.searchByNameOrNit(searchTerm);
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
    const existingOrganization = await organizationRepository.findById(organizationId);
    if (!existingOrganization) {
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

    // Verificar si el nuevo NIT ya existe (si se está cambiando)
    if (updateData.nit) {
      const nitExists = await organizationRepository.existsByNitExcludingId(
        updateData.nit, 
        organizationId
      );
      if (nitExists) {
        throw new Error('Ya existe una organización con ese NIT');
      }
    }

    // Si se está actualizando el PDF, eliminar el archivo anterior
    if (updateData.certificado_pdf && existingOrganization.certificado_pdf) {
      console.log(`🗑️ Eliminando archivo anterior: ${existingOrganization.certificado_pdf}`);
      await deleteFile(existingOrganization.certificado_pdf);
    }

    // Actualizar la organización
    await organizationRepository.update(organizationId, updateData);

    // Obtener la organización actualizada
    const updatedOrganization = await organizationRepository.findById(organizationId);
    return updatedOrganization;
  }

  // Obtener todas las organizaciones (sin paginación)
  async getAllOrganizations() {
    const organizations = await organizationRepository.findAll();
    return organizations;
  }

  // Eliminar organización (solo secretarios y administradores)
  async deleteOrganization(organizationId) {
    // Verificar que la organización existe
    const existingOrganization = await organizationRepository.findById(organizationId);
    if (!existingOrganization) {
      throw new Error('Organización no encontrada');
    }

    // Eliminar archivos físicos asociados
    if (existingOrganization.certificado_pdf) {
      console.log(`🗑️ Eliminando archivo: ${existingOrganization.certificado_pdf}`);
      await deleteFile(existingOrganization.certificado_pdf);
    }

    // Eliminar la organización de la base de datos
    const deleted = await organizationRepository.delete(organizationId);
    if (!deleted) {
      throw new Error('Error al eliminar la organización');
    }

    return { success: true, message: 'Organización eliminada exitosamente' };
  }
}

module.exports = new OrganizationService();
