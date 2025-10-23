const eventService = require('../services/eventService');

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

    const updateData = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio;
    if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin;
    if (lugar !== undefined) updateData.lugar = lugar;
    if (unidad_academica_id !== undefined) updateData.unidad_academica_id = unidad_academica_id;
    if (organizacion_externa_id !== undefined) updateData.organizacion_externa_id = organizacion_externa_id;

    const updatedEvent = await eventService.updateEvent(id, updateData);

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

// Función adicional: Obtener eventos por estado
const getEventsByStatus = async (req, res) => {
  try {
    const estado = req.query.estado;
    const page = req.query.page;
    const limit = req.query.limit;

    console.log('Parámetros eventos recibidos:', { estado, page, limit });

    const result = await eventService.getEventsByStatus(estado, page, limit);

    res.status(200).json({
      success: true,
      data: result
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

    const eventData = {
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

module.exports = {
  createEvent,
  updateEvent,
  submitEventForValidation,
  getEventById,
  getEventsByStatus
};
