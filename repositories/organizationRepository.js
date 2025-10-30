const { executeQuery } = require('../db');

class OrganizationRepository {
  // Crear nueva organización
  async create(organizationData) {
    const {
      nit,
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
      (nit, nombre, representante_legal, telefono, ubicacion, sector_economico, actividad_principal, certificado_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(query, [
      nit,
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

  // Buscar organizaciones por nombre o NIT (búsqueda parcial)
  async searchByNameOrNit(searchTerm) {
    let query = 'SELECT * FROM organizaciones_externas WHERE 1=1';
    const params = [];

    if (searchTerm) {
      query += ' AND (nombre LIKE ? OR nit LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ' ORDER BY nombre ASC';

    const organizations = await executeQuery(query, params);
    return organizations;
  }

  // Buscar organizaciones por nombre (búsqueda parcial) - método legacy
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

  // Obtener todas las organizaciones (sin paginación)
  async findAll() {
    const query = `
      SELECT *
      FROM organizaciones_externas
      ORDER BY nombre ASC
    `;
    const organizations = await executeQuery(query);
    return organizations;
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

  // Verificar si existe una organización con el NIT dado
  async existsByNit(nit) {
    const query = 'SELECT id FROM organizaciones_externas WHERE nit = ?';
    const result = await executeQuery(query, [nit]);
    return result.length > 0;
  }

  // Verificar si existe una organización con el NIT dado (excluyendo un ID específico)
  async existsByNitExcludingId(nit, excludeId) {
    const query = 'SELECT id FROM organizaciones_externas WHERE nit = ? AND id != ?';
    const result = await executeQuery(query, [nit, excludeId]);
    return result.length > 0;
  }

  // Verificar que la organización existe
  async exists(id) {
    const query = 'SELECT id FROM organizaciones_externas WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }

  // Verificar si la organización está vinculada a eventos
  async hasLinkedEvents(id) {
    const query = `
      SELECT COUNT(*) as count 
      FROM organizaciones_eventos 
      WHERE organizacion_externa_id = ?
    `;
    const result = await executeQuery(query, [id]);
    return result[0].count > 0;
  }

  // Eliminar organización (solo si no está vinculada a eventos)
  async delete(id) {
    // Verificar que la organización existe
    if (!(await this.exists(id))) {
      throw new Error('Organización no encontrada');
    }

    // Verificar que no esté vinculada a eventos
    if (await this.hasLinkedEvents(id)) {
      throw new Error('No se puede eliminar la organización porque está vinculada a eventos existentes');
    }

    // Eliminar la organización
    const query = 'DELETE FROM organizaciones_externas WHERE id = ?';
    const result = await executeQuery(query, [id]);
    
    return result.affectedRows > 0;
  }
}

module.exports = new OrganizationRepository();
