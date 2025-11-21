const { executeQuery } = require('../db');

class EventRepository {
  // Crear nuevo evento
  async create(eventData) {
    const {
      titulo,
      descripcion,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      lugar_id,
      capacidad_esperada,
      acta_comite_pdf
    } = eventData;

    const query = `
      INSERT INTO eventos 
      (titulo, descripcion, tipo, fecha, hora_inicio, hora_fin, lugar_id, capacidad_esperada, estado, 
       acta_comite_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, NOW())
    `;

    const result = await executeQuery(query, [
      titulo,
      descripcion,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      lugar_id,
      capacidad_esperada,
      acta_comite_pdf || null
    ]);

    return result.insertId;
  }

  // Buscar evento por ID
  async findById(id) {
    const query = `
      SELECT e.*, 
             l.nombre as lugar_nombre,
             l.capacidad_max,
             (SELECT eo2.usuario_id 
              FROM eventos_organizadores eo2 
              WHERE eo2.evento_id = e.id 
              ORDER BY eo2.id ASC 
              LIMIT 1) as creador_id
      FROM eventos e
      LEFT JOIN lugares l ON e.lugar_id = l.id
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
      SELECT re.*, u.nombre, u.correo, ua.nombre as unidad_academica_nombre
      FROM responsables_eventos re
      INNER JOIN usuarios u ON re.usuario_id = u.id
      LEFT JOIN unidades_academicas ua ON re.unidad_academica_id = ua.id
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
  async addResponsibleToEvent(eventId, usuarioId, unidadAcademicaId, rolResponsable) {
    const query = `
      INSERT INTO responsables_eventos (evento_id, usuario_id, unidad_academica_id, rol_responsable)
      VALUES (?, ?, ?, ?)
    `;
    await executeQuery(query, [eventId, usuarioId, unidadAcademicaId, rolResponsable]);
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
    const query = 'SELECT id, estado, titulo, descripcion, fecha, hora_inicio, hora_fin, lugar_id, capacidad_esperada FROM eventos WHERE id = ?';
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

  // Buscar eventos por estado (sin paginación) - incluye información del creador
  async findByStatus(estado) {
    let baseQuery = `
      FROM eventos e
      LEFT JOIN lugares l ON e.lugar_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      baseQuery += ' AND e.estado = ?';
      params.push(estado);
    }

    // Obtener registros con información del creador
    const dataQuery = `
      SELECT e.*, 
             l.nombre as lugar_nombre,
             l.capacidad_max,
             (SELECT eo2.usuario_id 
              FROM eventos_organizadores eo2 
              WHERE eo2.evento_id = e.id 
              ORDER BY eo2.id ASC 
              LIMIT 1) as creador_id
      ${baseQuery}
      ORDER BY e.fecha_registro DESC
    `;
    const dataParams = [...params];

    const events = await executeQuery(dataQuery, dataParams);

    return events;
  }

  // Obtener organizadores de un evento
  async getEventOrganizers(eventId) {
    const query = `
      SELECT eo.*, u.nombre, u.correo, u.rol_id, u.programa_id, u.facultad_id
      FROM eventos_organizadores eo
      INNER JOIN usuarios u ON eo.usuario_id = u.id
      WHERE eo.evento_id = ?
      ORDER BY eo.id ASC
    `;
    const organizers = await executeQuery(query, [eventId]);
    return organizers;
  }

  // Obtener el creador del evento (el primer organizador agregado)
  async getEventCreator(eventId) {
    const query = `
      SELECT eo.usuario_id, u.nombre, u.correo
      FROM eventos_organizadores eo
      INNER JOIN usuarios u ON eo.usuario_id = u.id
      WHERE eo.evento_id = ?
      ORDER BY eo.id ASC
      LIMIT 1
    `;
    const [creator] = await executeQuery(query, [eventId]);
    return creator;
  }

  // Agregar organizador a evento
  async addOrganizerToEvent(eventId, usuarioId) {
    // Verificar si ya existe la relación
    const checkQuery = 'SELECT id FROM eventos_organizadores WHERE evento_id = ? AND usuario_id = ?';
    const existing = await executeQuery(checkQuery, [eventId, usuarioId]);
    if (existing.length > 0) {
      return; // Ya existe, no hacer nada
    }

    const query = `
      INSERT INTO eventos_organizadores (evento_id, usuario_id)
      VALUES (?, ?)
    `;
    await executeQuery(query, [eventId, usuarioId]);
  }

  // Eliminar todos los organizadores de un evento
  async removeAllOrganizersFromEvent(eventId) {
    const query = 'DELETE FROM eventos_organizadores WHERE evento_id = ?';
    await executeQuery(query, [eventId]);
  }

  // Obtener unidades académicas de un evento
  async getEventAcademicUnits(eventId) {
    const query = `
      SELECT ue.*, ua.nombre, ua.director
      FROM unidades_eventos ue
      INNER JOIN unidades_academicas ua ON ue.unidad_academica_id = ua.id
      WHERE ue.evento_id = ?
    `;
    const units = await executeQuery(query, [eventId]);
    return units;
  }

  // Agregar unidad académica a evento
  async addAcademicUnitToEvent(eventId, unidadAcademicaId) {
    // Verificar si ya existe la relación
    const checkQuery = 'SELECT id FROM unidades_eventos WHERE evento_id = ? AND unidad_academica_id = ?';
    const existing = await executeQuery(checkQuery, [eventId, unidadAcademicaId]);
    if (existing.length > 0) {
      return; // Ya existe, no hacer nada
    }

    const query = `
      INSERT INTO unidades_eventos (evento_id, unidad_academica_id)
      VALUES (?, ?)
    `;
    await executeQuery(query, [eventId, unidadAcademicaId]);
  }

  // Eliminar todas las unidades académicas de un evento
  async removeAllAcademicUnitsFromEvent(eventId) {
    const query = 'DELETE FROM unidades_eventos WHERE evento_id = ?';
    await executeQuery(query, [eventId]);
  }

  // Obtener avales de un evento
  async getEventAvales(eventId) {
    const query = `
      SELECT a.*, 
             pa.nombre as programa_nombre,
             ua.nombre as unidad_academica_nombre
      FROM avales_eventos a
      LEFT JOIN programas_academicos pa ON a.programa_id = pa.id
      LEFT JOIN unidades_academicas ua ON a.unidad_academica_id = ua.id
      WHERE a.evento_id = ?
    `;
    const avales = await executeQuery(query, [eventId]);
    return avales;
  }

  // Agregar aval a evento
  async addAvalToEvent(eventId, programaId, unidadAcademicaId, archivoPdf) {
    const query = `
      INSERT INTO avales_eventos (evento_id, programa_id, unidad_academica_id, archivo_pdf)
      VALUES (?, ?, ?, ?)
    `;
    await executeQuery(query, [eventId, programaId || null, unidadAcademicaId || null, archivoPdf]);
  }

  // Eliminar todos los avales de un evento
  async removeAllAvalesFromEvent(eventId) {
    const query = 'DELETE FROM avales_eventos WHERE evento_id = ?';
    await executeQuery(query, [eventId]);
  }

  // Buscar eventos por organizador con filtros (sin paginación)
  async findByOrganizer(organizadorId, filters = {}) {
    // Asegurar que organizadorId sea un número
    const orgId = parseInt(organizadorId);
    
    let baseQuery = `
      FROM eventos e
      INNER JOIN eventos_organizadores eo ON e.id = eo.evento_id
      WHERE eo.usuario_id = ?
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

    // Filtro por fecha
    if (filters.fecha) {
      baseQuery += ' AND e.fecha = ?';
      params.push(filters.fecha);
    }

    // Filtro por fecha desde
    if (filters.fecha_desde) {
      baseQuery += ' AND e.fecha >= ?';
      params.push(filters.fecha_desde);
    }

    // Filtro por fecha hasta
    if (filters.fecha_hasta) {
      baseQuery += ' AND e.fecha <= ?';
      params.push(filters.fecha_hasta);
    }

    // Obtener todos los eventos con información del creador
    const dataQuery = `
      SELECT DISTINCT e.*,
             (SELECT eo2.usuario_id 
              FROM eventos_organizadores eo2 
              WHERE eo2.evento_id = e.id 
              ORDER BY eo2.id ASC 
              LIMIT 1) as creador_id
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
