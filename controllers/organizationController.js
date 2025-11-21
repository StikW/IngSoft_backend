const organizationService = require('../services/organizationService');
const organizationRepository = require('../repositories/organizationRepository');

// HU2.1 - Registro de organización externa (INSERT)
const createOrganization = async (req, res) => {
  try {
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
      actividad_principal
    } = req.body;

    // Debug: ver qué está recibiendo el backend
    console.log('📋 Datos recibidos en createOrganization:', {
      representante_asiste,
      representante_alterno_nombre,
      representante_alterno_contacto,
      tipo_representante_asiste: typeof representante_asiste
    });

    // Obtener la ruta completa del archivo PDF si se subió
    const certificado_pdf = req.file ? `/uploads/${req.file.filename}` : null;

    // Parsear representante_asiste correctamente (puede venir como string "true"/"false" desde FormData)
    const representanteAsisteParsed = representante_asiste === true || representante_asiste === 'true' || representante_asiste === 1 || representante_asiste === '1';

    const organizationData = {
      nit,
      nombre,
      representante_legal,
      representante_asiste: representanteAsisteParsed,
      representante_alterno_nombre: representante_alterno_nombre || null,
      representante_alterno_contacto: representante_alterno_contacto || null,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf
    };

    const newOrganization = await organizationService.createOrganization(organizationData, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Organización creada exitosamente',
      data: {
        organization: newOrganization
      }
    });

  } catch (error) {
    console.error('Error creando organización:', error);
    const statusCode = error.message.includes('Ya existe') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU2.2 - Búsqueda de organización externa (SELECT con filtro por nombre o NIT)
const searchOrganizations = async (req, res) => {
  try {
    const { search } = req.query;

    const result = await organizationService.searchOrganizations(search);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error buscando organizaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU2.3 - Visualización de datos de organización externa (SELECT por id)
const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await organizationService.getOrganizationById(id);

    res.status(200).json({
      success: true,
      data: {
        organization
      }
    });

  } catch (error) {
    console.error('Error obteniendo organización:', error);
    const statusCode = error.message.includes('no encontrada') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU2.4 - Edición de organización externa (UPDATE)
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la organización existe
    const existingOrganization = await organizationRepository.findById(id);
    
    if (!existingOrganization) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Verificar que el usuario es el creador de la organización
    if (existingOrganization.creador_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar esta organización. Solo el creador puede editarla.'
      });
    }

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
      actividad_principal
    } = req.body;

    // Obtener la ruta completa del archivo PDF si se subió uno nuevo
    const certificado_pdf = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData = {};
    if (nit !== undefined) updateData.nit = nit;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (representante_legal !== undefined) updateData.representante_legal = representante_legal;
    if (representante_asiste !== undefined) {
      updateData.representante_asiste = representante_asiste === true || representante_asiste === 'true' || representante_asiste === 1;
    }
    if (representante_alterno_nombre !== undefined) updateData.representante_alterno_nombre = representante_alterno_nombre;
    if (representante_alterno_contacto !== undefined) updateData.representante_alterno_contacto = representante_alterno_contacto;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
    if (sector_economico !== undefined) updateData.sector_economico = sector_economico;
    if (actividad_principal !== undefined) updateData.actividad_principal = actividad_principal;
    if (certificado_pdf !== undefined) updateData.certificado_pdf = certificado_pdf;

    const updatedOrganization = await organizationService.updateOrganization(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Organización actualizada exitosamente',
      data: {
        organization: updatedOrganization
      }
    });

  } catch (error) {
    console.error('Error actualizando organización:', error);
    const statusCode = error.message.includes('no encontrada') ? 404 :
                      error.message.includes('Ya existe') ? 409 :
                      error.message.includes('No se proporcionaron') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener todas las organizaciones (sin paginación)
const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await organizationService.getAllOrganizations();

    res.status(200).json({
      success: true,
      data: { organizations }
    });

  } catch (error) {
    console.error('Error obteniendo organizaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar organización
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la organización existe
    const organizationRepository = require('../repositories/organizationRepository');
    const existingOrganization = await organizationRepository.findById(id);
    
    if (!existingOrganization) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Verificar que el usuario es el creador de la organización
    if (existingOrganization.creador_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta organización. Solo el creador puede eliminarla.'
      });
    }

    // Eliminar la organización
    const result = await organizationService.deleteOrganization(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error al eliminar organización:', error);
    const statusCode = error.message.includes('no encontrada') ? 404 :
                      error.message.includes('vinculada a eventos') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createOrganization,
  searchOrganizations,
  getOrganizationById,
  updateOrganization,
  getAllOrganizations,
  deleteOrganization
};

