const { executeQuery } = require('../db');

// HU2.1 - Registro de organización externa (INSERT)
const createOrganization = async (req, res) => {
  try {
    const { 
      nombre, 
      representante_legal, 
      telefono, 
      ubicacion, 
      sector_economico, 
      actividad_principal, 
      certificado_pdf 
    } = req.body;

    // Verificar si ya existe una organización con el mismo nombre
    const checkQuery = 'SELECT id FROM organizaciones_externas WHERE nombre = ?';
    const existing = await executeQuery(checkQuery, [nombre]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una organización con ese nombre'
      });
    }

    // Insertar nueva organización
    const insertQuery = `
      INSERT INTO organizaciones_externas 
      (nombre, representante_legal, telefono, ubicacion, sector_economico, actividad_principal, certificado_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(insertQuery, [
      nombre,
      representante_legal,
      telefono || null,
      ubicacion || null,
      sector_economico || null,
      actividad_principal || null,
      certificado_pdf || null
    ]);

    // Obtener la organización creada
    const newOrgQuery = 'SELECT * FROM organizaciones_externas WHERE id = ?';
    const newOrg = await executeQuery(newOrgQuery, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Organización creada exitosamente',
      data: {
        organization: newOrg[0]
      }
    });

  } catch (error) {
    console.error('Error creando organización:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU2.2 - Búsqueda de organización externa (SELECT con filtro por nombre)
const searchOrganizations = async (req, res) => {
  try {
    const { nombre } = req.query;
    let query = 'SELECT * FROM organizaciones_externas WHERE 1=1';
    const params = [];

    // Filtro por nombre (búsqueda parcial)
    if (nombre) {
      query += ' AND nombre LIKE ?';
      params.push(`%${nombre}%`);
    }

    query += ' ORDER BY nombre ASC';

    const organizations = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      data: {
        organizations,
        total: organizations.length
      }
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

    const query = 'SELECT * FROM organizaciones_externas WHERE id = ?';
    const organizations = await executeQuery(query, [id]);

    if (organizations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        organization: organizations[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo organización:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU2.4 - Edición de organización externa (UPDATE)
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      representante_legal, 
      telefono, 
      ubicacion, 
      sector_economico, 
      actividad_principal, 
      certificado_pdf 
    } = req.body;

    // Verificar que la organización existe
    const checkQuery = 'SELECT id FROM organizaciones_externas WHERE id = ?';
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (nombre) {
      const nameCheckQuery = 'SELECT id FROM organizaciones_externas WHERE nombre = ? AND id != ?';
      const nameExists = await executeQuery(nameCheckQuery, [nombre, id]);

      if (nameExists.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una organización con ese nombre'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateParams = [];

    if (nombre !== undefined) {
      updateFields.push('nombre = ?');
      updateParams.push(nombre);
    }
    if (representante_legal !== undefined) {
      updateFields.push('representante_legal = ?');
      updateParams.push(representante_legal);
    }
    if (telefono !== undefined) {
      updateFields.push('telefono = ?');
      updateParams.push(telefono);
    }
    if (ubicacion !== undefined) {
      updateFields.push('ubicacion = ?');
      updateParams.push(ubicacion);
    }
    if (sector_economico !== undefined) {
      updateFields.push('sector_economico = ?');
      updateParams.push(sector_economico);
    }
    if (actividad_principal !== undefined) {
      updateFields.push('actividad_principal = ?');
      updateParams.push(actividad_principal);
    }
    if (certificado_pdf !== undefined) {
      updateFields.push('certificado_pdf = ?');
      updateParams.push(certificado_pdf);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }

    updateParams.push(id);

    const updateQuery = `
      UPDATE organizaciones_externas 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await executeQuery(updateQuery, updateParams);

    // Obtener la organización actualizada
    const updatedOrgQuery = 'SELECT * FROM organizaciones_externas WHERE id = ?';
    const updatedOrg = await executeQuery(updatedOrgQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Organización actualizada exitosamente',
      data: {
        organization: updatedOrg[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando organización:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener todas las organizaciones (para listado completo)
const getAllOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM organizaciones_externas WHERE 1=1';
    const params = [];

    // Contar total de registros
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Obtener registros paginados
    query += ' ORDER BY nombre ASC';
    params.push(limit, offset);

    const organizations = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
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

module.exports = {
  createOrganization,
  searchOrganizations,
  getOrganizationById,
  updateOrganization,
  getAllOrganizations
};

