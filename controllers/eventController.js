const eventService = require('../services/eventService');
const eventRepository = require('../repositories/eventRepository');

// HU1.2 - Edición de evento antes de validación (UPDATE)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descripcion, 
      fecha_inicio, 
      fecha_fin, 
      lugar_id,
      capacidad_esperada,
      unidad_academica_id
    } = req.body;

    // Obtener archivos subidos
    const acta_comite_pdf = req.files && req.files.acta_comite_pdf ? `/uploads/${req.files.acta_comite_pdf[0].filename}` : undefined;

    const updateData = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio;
    if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin;
    if (lugar_id !== undefined) updateData.lugar_id = parseInt(lugar_id);
    if (capacidad_esperada !== undefined) updateData.capacidad_esperada = parseInt(capacidad_esperada);
    if (unidad_academica_id !== undefined) updateData.unidad_academica_id = parseInt(unidad_academica_id);
    if (acta_comite_pdf !== undefined) updateData.acta_comite_pdf = acta_comite_pdf;

    // Manejar organizaciones_externas_ids que puede venir como array, string separado por comas, o string único
    let organizacionesArray = undefined;
    if (req.body.organizaciones_externas_ids !== undefined) {
      organizacionesArray = [];
      const raw = req.body.organizaciones_externas_ids;
      if (Array.isArray(raw)) {
        organizacionesArray = raw.map(v => parseInt(v)).filter(v => !isNaN(v));
      } else if (typeof raw === 'string') {
        if (raw.includes(',')) {
          organizacionesArray = raw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
          const parsed = parseInt(raw);
          if (!isNaN(parsed)) organizacionesArray = [parsed];
        }
      }
    }

    const updatedEvent = await eventService.updateEvent(id, updateData, organizacionesArray);

    res.status(200).json({
      success: true,
      message: 'Evento actualizado exitosamente',
      data: {
        event: updatedEvent
      }
    });

  } catch (error) {
    console.error('Error actualizando evento:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 :
                      error.message.includes('No se proporcionaron') ? 400 :
                      error.message.includes('Solo se pueden editar') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU1.5 - Envío de evento a validación/aprobación (UPDATE estado del evento)
const submitEventForValidation = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedEvent = await eventService.submitEventForValidation(id);

    res.status(200).json({
      success: true,
      message: 'Evento enviado a validación exitosamente',
      data: {
        event: updatedEvent
      }
    });

  } catch (error) {
    console.error('Error enviando evento a validación:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 :
                      error.message.includes('Solo se pueden enviar') ? 400 :
                      error.message.includes('campos requeridos') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener evento por ID
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id);

    res.status(200).json({
      success: true,
      data: {
        event
      }
    });

  } catch (error) {
    console.error('Error obteniendo evento:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener eventos por estado (sin paginación)
const getEventsByStatus = async (req, res) => {
  try {
    const estado = req.query.estado;
    console.log('Parámetros eventos recibidos:', { estado });

    const events = await eventService.getEventsByStatus(estado);

    res.status(200).json({
      success: true,
      data: { events }
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
      lugar_id,
      capacidad_esperada,
      unidad_academica_id,
      organizaciones_externas_ids,
      responsables
    } = req.body;

    // Obtener archivos subidos
    const acta_comite_pdf = req.files && req.files.acta_comite_pdf ? `/uploads/${req.files.acta_comite_pdf[0].filename}` : null;

    const organizador_id = req.user.id;

    // Manejar organizaciones_externas_ids que puede venir como array, string separado por comas, o string único
    let organizacionesArray = [];
    if (organizaciones_externas_ids) {
      if (Array.isArray(organizaciones_externas_ids)) {
        organizacionesArray = organizaciones_externas_ids;
      } else if (typeof organizaciones_externas_ids === 'string') {
        // Si viene como string separado por comas
        if (organizaciones_externas_ids.includes(',')) {
          organizacionesArray = organizaciones_externas_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
          organizacionesArray = [parseInt(organizaciones_externas_ids)];
        }
      }
    }

    const eventData = {
      titulo,
      descripcion,
      tipo,
      fecha_inicio,
      fecha_fin,
      lugar_id: parseInt(lugar_id),
      capacidad_esperada: parseInt(capacidad_esperada),
      unidad_academica_id: parseInt(unidad_academica_id),
      organizaciones_externas_ids: organizacionesArray,
      responsables,
      acta_comite_pdf
    };

    const newEvent = await eventService.createEvent(eventData, organizador_id);

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: {
        event: newEvent
      }
    });

  } catch (error) {
    console.error('Error creando evento:', error);
    const statusCode = error.message.includes('no encontrada') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función adicional: Obtener todas las unidades académicas
const getAllAcademicUnits = async (req, res) => {
  try {
    const units = await eventService.getAllAcademicUnits();

    res.status(200).json({
      success: true,
      data: {
        units
      }
    });

  } catch (error) {
    console.error('Error obteniendo unidades académicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU1.4 - Obtener eventos del organizador (Mis eventos) sin paginación
const getMyEvents = async (req, res) => {
  try {
    const organizadorId = req.user.id;
    const { estado, titulo, fecha_inicio, fecha_fin } = req.query;

    console.log('🔍 Buscando eventos para organizador:', organizadorId);
    console.log('📋 Filtros aplicados:', { estado, titulo, fecha_inicio, fecha_fin });

    const filters = {};
    if (estado) filters.estado = estado;
    if (titulo) filters.titulo = titulo;
    if (fecha_inicio) filters.fecha_inicio = fecha_inicio;
    if (fecha_fin) filters.fecha_fin = fecha_fin;

    const events = await eventService.getUserEvents(organizadorId, filters);

    console.log('✅ Eventos encontrados:', events?.length || 0);

    res.status(200).json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('❌ Error obteniendo eventos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU4.1 - Aprobar evento
const approveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedEvent = await eventService.approveEvent(id);

    res.status(200).json({
      success: true,
      message: 'Evento aprobado exitosamente',
      data: {
        event: updatedEvent
      }
    });

  } catch (error) {
    console.error('Error aprobando evento:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 :
                      error.message.includes('Solo se pueden aprobar') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// HU4.1 - Rechazar evento
const rejectEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { justificacion } = req.body;

    const updatedEvent = await eventService.rejectEvent(id, justificacion);

    res.status(200).json({
      success: true,
      message: 'Evento rechazado exitosamente',
      data: {
        event: updatedEvent
      }
    });

  } catch (error) {
    console.error('Error rechazando evento:', error);
    const statusCode = error.message.includes('no encontrado') ? 404 :
                      error.message.includes('Solo se pueden rechazar') ? 400 :
                      error.message.includes('justificación') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar evento
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el evento existe y pertenece al usuario
    const existingEvent = await eventRepository.findBasicById(id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Verificar permisos para eliminar el evento
    const userRole = req.user.rol_id;
    const isSecretarioOrAdmin = userRole === 3 || userRole === 4; // secretario o administrador
    const isEventOrganizer = existingEvent.organizador_id === userId;
    
    // Solo se pueden eliminar eventos en estado 'borrador'
    if (existingEvent.estado !== 'borrador') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar eventos en estado borrador'
      });
    }
    
    // Verificar permisos: secretarios/administradores pueden eliminar cualquier evento en borrador,
    // organizadores solo pueden eliminar sus propios eventos en borrador
    if (!isSecretarioOrAdmin && !isEventOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este evento'
      });
    }

    // Eliminar el evento
    const result = await eventService.deleteEvent(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus,
  getAllAcademicUnits,
  getMyEvents,
  approveEvent,
  rejectEvent,
  deleteEvent
};
