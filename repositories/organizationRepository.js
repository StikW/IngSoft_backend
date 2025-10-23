const { executeQuery } = require('../db');

class OrganizationRepository {
  // Crear nueva organización
  async create(organizationData) {
    const {
      nombre,
      representante_legal,
      telefono,
      ubicacion,
      sector_economico,
      actividad_principal,
      certificado_pdf
    } = organizationData;

    const query = `
      INSERT INTO organizaciones_externas 
      (nombre, representante_legal, telefono, ubicacion, sector_economico, actividad_principal, certificado_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(query, [
      nombre,
      representante_legal,
      telefono || null,
      ubicacion || null,
      sector_economico || null,
      actividad_principal || null,
      certificado_pdf || null
    ]);

    return result.insertId;
  }

  // Buscar organización por ID
  async findById(id) {
    const query = 'SELECT * FROM organizaciones_externas WHERE id = ?';
    const [organization] = await executeQuery(query, [id]);
    return organization;
  }

  // Buscar organizaciones por nombre (búsqueda parcial)
  async searchByName(nombre) {
    let query = 'SELECT * FROM organizaciones_externas WHERE 1=1';
    const params = [];

    if (nombre) {
      query += ' AND nombre LIKE ?';
      params.push(`%${nombre}%`);
    }

    query += ' ORDER BY nombre ASC';

    const organizations = await executeQuery(query, params);
    return organizations;
  }

  // Obtener todas las organizaciones con paginación
  async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const baseQuery = 'FROM organizaciones_externas WHERE 1=1';
    const params = [];

    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Obtener registros paginados
    const dataQuery = `
      SELECT * 
      ${baseQuery}
      ORDER BY nombre ASC
    `;
    const dataParams = [...params];

    const organizations = await executeQuery(dataQuery, dataParams);

    return {
      organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Actualizar organización
  async update(id, updateData) {
    const updateFields = [];
    const updateParams = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No se proporcionaron campos para actualizar');
    }

    updateParams.push(id);

    const query = `
      UPDATE organizaciones_externas 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await executeQuery(query, updateParams);
  }

  // Verificar si existe una organización con el nombre dado
  async existsByName(nombre) {
    const query = 'SELECT id FROM organizaciones_externas WHERE nombre = ?';
    const result = await executeQuery(query, [nombre]);
    return result.length > 0;
  }

  // Verificar si existe una organización con el nombre dado (excluyendo un ID específico)
  async existsByNameExcludingId(nombre, excludeId) {
    const query = 'SELECT id FROM organizaciones_externas WHERE nombre = ? AND id != ?';
    const result = await executeQuery(query, [nombre, excludeId]);
    return result.length > 0;
  }

  // Verificar que la organización existe
  async exists(id) {
    const query = 'SELECT id FROM organizaciones_externas WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }
}

module.exports = new OrganizationRepository();
