const eventRepository = require('../repositories/eventRepository');

class EventService {
  // Crear nuevo evento
  async createEvent(eventData, organizadorId) {
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
    } = eventData;

    // Verificar que la unidad académica existe (si se proporciona)
    if (unidad_academica_id) {
      const unitExists = await eventRepository.verifyUnitExists(unidad_academica_id);
      if (!unitExists) {
        throw new Error('Unidad académica no encontrada');
      }
    }

    // Verificar que la organización externa existe (si se proporciona)
    if (organizacion_externa_id) {
      const orgExists = await eventRepository.verifyOrganizationExists(organizacion_externa_id);
      if (!orgExists) {
        throw new Error('Organización externa no encontrada');
      }
    }

    // Crear el evento
    const eventId = await eventRepository.create({
      titulo,
      descripcion,
      tipo,
      fecha_inicio,
      fecha_fin,
      lugar,
      unidad_academica_id,
      organizador_id: organizadorId,
      organizacion_externa_id,
      aval_pdf,
      acta_comite_pdf
    });

    // Obtener el evento creado con información completa
    const newEvent = await eventRepository.findById(eventId);
    return newEvent;
  }

  // Actualizar evento
  async updateEvent(eventId, updateData) {
    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Solo permitir edición si el evento está en estado 'borrador' o 'enviado'
    if (!['borrador', 'enviado'].includes(existingEvent.estado)) {
      throw new Error('Solo se pueden editar eventos en estado "borrador" o "enviado"');
    }

    // Actualizar el evento
    await eventRepository.update(eventId, updateData);

    // Obtener el evento actualizado
    const updatedEvent = await eventRepository.findById(eventId);
    return updatedEvent;
  }

  // Enviar evento a validación
  async submitEventForValidation(eventId) {
    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Solo permitir envío a validación si el evento está en estado 'borrador'
    if (existingEvent.estado !== 'borrador') {
      throw new Error('Solo se pueden enviar a validación eventos en estado "borrador"');
    }

    // Validar que el evento tenga todos los campos requeridos
    const requiredFields = ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'lugar'];
    const missingFields = requiredFields.filter(field => 
      !existingEvent[field] || existingEvent[field].trim() === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`El evento debe tener todos los campos requeridos antes de enviarse a validación. Faltan: ${missingFields.join(', ')}`);
    }

    // Actualizar estado a 'enviado'
    await eventRepository.updateStatus(eventId, 'enviado');

    // Obtener el evento actualizado
    const updatedEvent = await eventRepository.findById(eventId);
    return updatedEvent;
  }

  // Obtener evento por ID
  async getEventById(eventId) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new Error('Evento no encontrado');
    }

    return event;
  }

  // Obtener eventos por estado con paginación
  async getEventsByStatus(estado, page = 1, limit = 10) {
    // Validar parámetros
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

    const result = await eventRepository.findByStatus(estado, validPage, validLimit);
    return result;
  }
}

module.exports = new EventService();
