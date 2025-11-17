const organizationService = require('../services/organizationService');

// HU2.1 - Registro de organización externa (INSERT)
const createOrganization = async (req, res) => {
  try {
    const { 
      nit,
      nombre, 
      representante_legal,
      representante_asiste,
      telefono, 
      ubicacion, 
      sector_economico, 
      actividad_principal
    } = req.body;

    // Obtener la ruta completa del archivo PDF si se subió
    const certificado_pdf = req.file ? `/uploads/${req.file.filename}` : null;

    const organizationData = {
      nit,
      nombre,
      representante_legal,
      representante_asiste: representante_asiste === true || representante_asiste === 'true',
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
    const { 
      nit,
      nombre, 
      representante_legal,
      representante_asiste,
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
    if (representante_legal_asiste !== undefined) updateData.representante_legal_asiste = representante_legal_asiste === true || representante_legal_asiste === 'true';
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

