const { executeQuery } = require('../db');

class EventRepository {
  // Crear nuevo evento
  async create(eventData) {
    const {
      titulo,
      descripcion,
      tipo,
      fecha_inicio,
      fecha_fin,
      lugar,
      unidad_academica_id,
      organizador_id,
      organizacion_externa_id,
      aval_pdf,
      acta_comite_pdf
    } = eventData;

    const query = `
      INSERT INTO eventos 
      (titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar, estado, 
       unidad_academica_id, organizador_id, organizacion_externa_id, 
       aval_pdf, acta_comite_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(query, [
      titulo,
      descripcion,
      tipo,
      fecha_inicio,
      fecha_fin,
      lugar,
      unidad_academica_id || null,
      organizador_id,
      organizacion_externa_id || null,
      aval_pdf || null,
      acta_comite_pdf || null
    ]);

    return result.insertId;
  }

  // Buscar evento por ID
  async findById(id) {
    const query = `
      SELECT e.*, 
             u.nombre as organizador_nombre,
             o.nombre as organizacion_nombre,
             ua.nombre as unidad_academica_nombre
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      LEFT JOIN organizaciones_externas o ON e.organizacion_externa_id = o.id
      LEFT JOIN unidades_academicas ua ON e.unidad_academica_id = ua.id
      WHERE e.id = ?
    `;
    const [event] = await executeQuery(query, [id]);
    return event;
  }

  // Buscar evento por ID con información básica
  async findBasicById(id) {
    const query = 'SELECT id, estado, titulo, descripcion, fecha_inicio, fecha_fin, lugar FROM eventos WHERE id = ?';
    const [event] = await executeQuery(query, [id]);
    return event;
  }

  // Actualizar evento
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

    updateFields.push('fecha_actualizacion = NOW()');
    updateParams.push(id);

    const query = `
      UPDATE eventos 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await executeQuery(query, updateParams);
  }

  // Actualizar estado del evento
  async updateStatus(id, estado) {
    const query = `
      UPDATE eventos 
      SET estado = ?, fecha_actualizacion = NOW()
      WHERE id = ?
    `;
    await executeQuery(query, [estado, id]);
  }

  // Buscar eventos por estado con paginación
  async findByStatus(estado, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      LEFT JOIN organizaciones_externas o ON e.organizacion_externa_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      baseQuery += ' AND e.estado = ?';
      params.push(estado);
    }

    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Obtener registros paginados
    const dataQuery = `
      SELECT e.*, 
             u.nombre as organizador_nombre,
             o.nombre as organizacion_nombre
      ${baseQuery}
      ORDER BY e.fecha_registro DESC
    `;
    const dataParams = [...params];

    const events = await executeQuery(dataQuery, dataParams);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Verificar que la unidad académica existe
  async verifyUnitExists(id) {
    const query = 'SELECT id FROM unidades_academicas WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }

  // Verificar que la organización externa existe
  async verifyOrganizationExists(id) {
    const query = 'SELECT id FROM organizaciones_externas WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }
}

module.exports = new EventRepository();
