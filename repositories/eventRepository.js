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
      aval_pdf,
      acta_comite_pdf
    } = eventData;

    const query = `
      INSERT INTO eventos 
      (titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar, estado, 
       unidad_academica_id, organizador_id, 
       aval_pdf, acta_comite_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, NOW())
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
             ua.nombre as unidad_academica_nombre
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      LEFT JOIN unidades_academicas ua ON e.unidad_academica_id = ua.id
      WHERE e.id = ?
    `;
    const [event] = await executeQuery(query, [id]);
    return event;
  }

  // Obtener organizaciones asociadas a un evento
  async getEventOrganizations(eventId) {
    const query = `
      SELECT 
        o.id AS id,
        o.nombre,
        o.representante_legal,
        o.telefono,
        o.ubicacion
      FROM organizaciones_eventos oe
      INNER JOIN organizaciones_externas o ON oe.organizacion_externa_id = o.id
      WHERE oe.evento_id = ?
    `;
    const organizations = await executeQuery(query, [eventId]);
    return organizations;
  }

  // Obtener responsables asociados a un evento
  async getEventResponsibles(eventId) {
    const query = `
      SELECT re.*, u.nombre, u.correo
      FROM responsables_eventos re
      INNER JOIN usuarios u ON re.usuario_id = u.id
      WHERE re.evento_id = ?
    `;
    const responsibles = await executeQuery(query, [eventId]);
    return responsibles;
  }

  // Asociar organización a evento
  async addOrganizationToEvent(eventId, organizacionExternaId) {
    const query = `
      INSERT INTO organizaciones_eventos (evento_id, organizacion_externa_id)
      VALUES (?, ?)
    `;
    await executeQuery(query, [eventId, organizacionExternaId]);
  }

  // Asociar responsable a evento
  async addResponsibleToEvent(eventId, usuarioId, rolResponsable) {
    const query = `
      INSERT INTO responsables_eventos (evento_id, usuario_id, rol_responsable)
      VALUES (?, ?, ?)
    `;
    await executeQuery(query, [eventId, usuarioId, rolResponsable]);
  }

  // Eliminar todas las organizaciones de un evento
  async removeAllOrganizationsFromEvent(eventId) {
    const query = 'DELETE FROM organizaciones_eventos WHERE evento_id = ?';
    await executeQuery(query, [eventId]);
  }

  // Eliminar todos los responsables de un evento
  async removeAllResponsiblesFromEvent(eventId) {
    const query = 'DELETE FROM responsables_eventos WHERE evento_id = ?';
    await executeQuery(query, [eventId]);
  }

  // Buscar evento por ID con información básica
  async findBasicById(id) {
    const query = 'SELECT id, estado, titulo, descripcion, fecha_inicio, fecha_fin, lugar, organizador_id FROM eventos WHERE id = ?';
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
      SET estado = ?
      WHERE id = ?
    `;
    await executeQuery(query, [estado, id]);
  }

  // Actualizar estado del evento con justificación (para rechazo)
  async updateStatusWithJustification(id, estado, justificacion) {
    const query = `
      UPDATE eventos 
      SET estado = ?, justificacion_rechazo = ?
      WHERE id = ?
    `;
    await executeQuery(query, [estado, justificacion, id]);
  }

  // Buscar eventos por estado (sin paginación)
  async findByStatus(estado) {
    let baseQuery = `
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      baseQuery += ' AND e.estado = ?';
      params.push(estado);
    }

    // Obtener registros
    const dataQuery = `
      SELECT e.*, 
             u.nombre as organizador_nombre
      ${baseQuery}
      ORDER BY e.fecha_registro DESC
    `;
    const dataParams = [...params];

    const events = await executeQuery(dataQuery, dataParams);

    return events;
  }

  // Buscar eventos por organizador con filtros (sin paginación)
  async findByOrganizer(organizadorId, filters = {}) {
    // Asegurar que organizadorId sea un número
    const orgId = parseInt(organizadorId);
    
    let baseQuery = `
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      WHERE e.organizador_id = ?
    `;
    const params = [orgId];

    // Filtro por estado
    if (filters.estado) {
      baseQuery += ' AND e.estado = ?';
      params.push(filters.estado);
    }

    // Filtro por nombre/título
    if (filters.titulo) {
      baseQuery += ' AND e.titulo LIKE ?';
      params.push(`%${filters.titulo}%`);
    }

    // Filtro por fecha de inicio
    if (filters.fecha_inicio) {
      baseQuery += ' AND e.fecha_inicio >= ?';
      params.push(filters.fecha_inicio);
    }

    // Filtro por fecha de fin
    if (filters.fecha_fin) {
      baseQuery += ' AND e.fecha_inicio <= ?';
      params.push(filters.fecha_fin);
    }

    // Obtener todos los eventos
    const dataQuery = `
      SELECT e.*, 
             u.nombre as organizador_nombre
      ${baseQuery}
      ORDER BY e.fecha_registro DESC
    `;

    console.log('📝 Query SQL:', dataQuery);
    console.log('📋 Parámetros:', params);

    const events = await executeQuery(dataQuery, params);

    return events;
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

  // Obtener todas las unidades académicas
  async getAllAcademicUnits() {
    const query = 'SELECT * FROM unidades_academicas ORDER BY nombre ASC';
    const units = await executeQuery(query);
    return units;
  }

  // Eliminar evento (solo si está en estado 'borrador')
  async delete(eventId) {
    // Verificar que el evento existe y está en estado 'borrador'
    const event = await this.findBasicById(eventId);
    if (!event) {
      throw new Error('Evento no encontrado');
    }
    
    if (event.estado !== 'borrador') {
      throw new Error('Solo se pueden eliminar eventos en estado "borrador"');
    }

    // Eliminar el evento (las relaciones se eliminan automáticamente por CASCADE)
    const query = 'DELETE FROM eventos WHERE id = ?';
    const result = await executeQuery(query, [eventId]);
    
    return result.affectedRows > 0;
  }

  // Buscar unidad académica por ID
  async findAcademicUnitById(id) {
    const query = 'SELECT * FROM unidades_academicas WHERE id = ?';
    const [unit] = await executeQuery(query, [id]);
    return unit;
  }
}

module.exports = new EventRepository();
