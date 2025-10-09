const { executeQuery } = require('../db');

// HU1.2 - Edición de evento antes de validación (UPDATE)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_fin, 
      lugar, 
      unidad_academica_id,
      organizacion_externa_id
    } = req.body;

    // Verificar que el evento existe
    const checkQuery = 'SELECT id, estado FROM eventos WHERE id = ?';
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    const event = existing[0];

    // Solo permitir edición si el evento está en estado 'borrador' o 'enviado'
    if (!['borrador', 'enviado'].includes(event.estado)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden editar eventos en estado "borrador" o "enviado"'
      });
    }

    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateParams = [];

    if (titulo !== undefined) {
      updateFields.push('titulo = ?');
      updateParams.push(titulo);
    }
    if (descripcion !== undefined) {
      updateFields.push('descripcion = ?');
      updateParams.push(descripcion);
    }
    if (fecha_inicio !== undefined) {
      updateFields.push('fecha_inicio = ?');
      updateParams.push(fecha_inicio);
    }
    if (fecha_fin !== undefined) {
      updateFields.push('fecha_fin = ?');
      updateParams.push(fecha_fin);
    }
    if (lugar !== undefined) {
      updateFields.push('lugar = ?');
      updateParams.push(lugar);
    }
    if (unidad_academica_id !== undefined) {
      updateFields.push('unidad_academica_id = ?');
      updateParams.push(unidad_academica_id);
    }
    if (organizacion_externa_id !== undefined) {
      updateFields.push('organizacion_externa_id = ?');
      updateParams.push(organizacion_externa_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }

    updateFields.push('fecha_actualizacion = NOW()');
    updateParams.push(id);

    const updateQuery = `
      UPDATE eventos 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await executeQuery(updateQuery, updateParams);

    // Obtener el evento actualizado
    const updatedEventQuery = `
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
    const updatedEvent = await executeQuery(updatedEventQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      data: {
        event: updatedEvent[0]
      }
    });

  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU1.5 - Envío de evento a validación/aprobación (UPDATE estado del evento)
const submitEventForValidation = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el evento existe
    const checkQuery = 'SELECT id, estado, titulo, descripcion, fecha_inicio, fecha_fin, lugar FROM eventos WHERE id = ?';
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    const event = existing[0];

    // Solo permitir envío a validación si el evento está en estado 'borrador'
    if (event.estado !== 'borrador') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden enviar a validación eventos en estado "borrador"'
      });
    }

    // Validar que el evento tenga todos los campos requeridos
    const requiredFields = ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'lugar'];
    const missingFields = requiredFields.filter(field => !event[field] || event[field].trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El evento debe tener todos los campos requeridos antes de enviarse a validación',
        missingFields
      });
    }

    // Actualizar estado a 'enviado'
    const updateQuery = `
      UPDATE eventos 
      SET estado = 'enviado', 
          fecha_actualizacion = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [id]);

    // Obtener el evento actualizado
    const updatedEventQuery = `
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
    const updatedEvent = await executeQuery(updatedEventQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Evento enviado a validación exitosamente',
      data: {
        event: updatedEvent[0]
      }
    });

  } catch (error) {
    console.error('Error enviando evento a validación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener evento por ID
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT e.*, 
             u.nombre as organizador_nombre, 
             u.apellido as organizador_apellido,
             u.email as organizador_email,
             o.nombre as organizacion_nombre,
             o.email as organizacion_email
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      LEFT JOIN organizaciones_externas o ON e.organizacion_externa_id = o.id
      WHERE e.id = ?
    `;
    const events = await executeQuery(query, [id]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        event: events[0]
      }
    });

  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener eventos por estado
const getEventsByStatus = async (req, res) => {
  try {
    const estado = req.query.estado;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, 
             u.nombre as organizador_nombre,
             o.nombre as organizacion_nombre
      FROM eventos e
      LEFT JOIN usuarios u ON e.organizador_id = u.id
      LEFT JOIN organizaciones_externas o ON e.organizacion_externa_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND e.estado = ?';
      params.push(estado);
    }

    // Contar total de registros
    const countQuery = query.replace('SELECT e.*, u.nombre as organizador_nombre, o.nombre as organizacion_nombre', 'SELECT COUNT(*) as total');
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Obtener registros paginados
    query += ' ORDER BY e.fecha_registro DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const events = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU1.1 - Registro de evento
const createEvent = async (req, res) => {
  try {
    const { 
      titulo, 
      descripcion, 
      tipo,
      fecha_inicio, 
      fecha_fin, 
      lugar,
      unidad_academica_id,
      organizacion_externa_id,
      aval_pdf,
      acta_comite_pdf
    } = req.body;

    const organizador_id = req.user.id;

    // Verificar que la unidad académica existe (si se proporciona)
    if (unidad_academica_id) {
      const unitCheckQuery = 'SELECT id FROM unidades_academicas WHERE id = ?';
      const unitExists = await executeQuery(unitCheckQuery, [unidad_academica_id]);

      if (unitExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Unidad académica no encontrada'
        });
      }
    }

    // Verificar que la organización externa existe (si se proporciona)
    if (organizacion_externa_id) {
      const orgCheckQuery = 'SELECT id FROM organizaciones_externas WHERE id = ?';
      const orgExists = await executeQuery(orgCheckQuery, [organizacion_externa_id]);

      if (orgExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Organización externa no encontrada'
        });
      }
    }

    // Insertar nuevo evento
    const insertQuery = `
      INSERT INTO eventos 
      (titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar, estado, 
       unidad_academica_id, organizador_id, organizacion_externa_id, 
       aval_pdf, acta_comite_pdf, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(insertQuery, [
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

    // Obtener el evento creado con información del organizador y organización
    const newEventQuery = `
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
    const newEvent = await executeQuery(newEventQuery, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: {
        event: newEvent[0]
      }
    });

  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus
};
