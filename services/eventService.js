const eventRepository = require('../repositories/eventRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');

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
      organizaciones_externas_ids,
      responsables,
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

    // Verificar que las organizaciones externas existen (si se proporcionan)
    if (organizaciones_externas_ids && Array.isArray(organizaciones_externas_ids)) {
      for (const orgId of organizaciones_externas_ids) {
        const orgExists = await eventRepository.verifyOrganizationExists(orgId);
        if (!orgExists) {
          throw new Error(`Organización externa con ID ${orgId} no encontrada`);
        }
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
      aval_pdf,
      acta_comite_pdf
    });

    // Asociar organizaciones externas al evento (relación N:M)
    if (organizaciones_externas_ids && Array.isArray(organizaciones_externas_ids)) {
      for (const orgId of organizaciones_externas_ids) {
        await eventRepository.addOrganizationToEvent(eventId, orgId);
      }
    }

    // Asociar responsables al evento (relación N:M)
    if (responsables && Array.isArray(responsables)) {
      for (const responsable of responsables) {
        await eventRepository.addResponsibleToEvent(
          eventId, 
          responsable.usuario_id, 
          responsable.rol_responsable
        );
      }
    }

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

    // Solo permitir edición si el evento está en estado 'borrador', 'enviado' o 'rechazado'
    if (!['borrador', 'enviado', 'rechazado'].includes(existingEvent.estado)) {
      throw new Error('Solo se pueden editar eventos en estado "borrador", "enviado" o "rechazado"');
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

    // Solo permitir envío a validación si el evento está en estado 'borrador' o 'rechazado'
    if (!['borrador', 'rechazado'].includes(existingEvent.estado)) {
      throw new Error('Solo se pueden enviar a validación eventos en estado "borrador" o "rechazado"');
    }

    // Validar que el evento tenga todos los campos requeridos
    const requiredFields = ['titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'lugar'];
    const missingFields = requiredFields.filter(field => {
      const value = existingEvent[field];
      // Para campos de fecha, solo verificar que existan
      if (field === 'fecha_inicio' || field === 'fecha_fin') {
        return !value;
      }
      // Para campos de texto, verificar que no estén vacíos
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      throw new Error(`El evento debe tener todos los campos requeridos antes de enviarse a validación. Faltan: ${missingFields.join(', ')}`);
    }

    // Actualizar estado a 'enviado'
    await eventRepository.updateStatus(eventId, 'enviado');

    // Obtener información del organizador para la notificación
    console.log('🔍 Organizador ID:', existingEvent.organizador_id);
    
    if (!existingEvent.organizador_id) {
      console.error('❌ Error: organizador_id es undefined o null');
      throw new Error('El evento no tiene un organizador válido');
    }

    const organizador = await userRepository.findById(existingEvent.organizador_id);
    console.log('👤 Organizador encontrado:', organizador);
    
    if (!organizador) {
      console.error('❌ Error: No se encontró el organizador con ID:', existingEvent.organizador_id);
      throw new Error('No se encontró el organizador del evento');
    }
    
    // Crear notificaciones para todos los secretarios
    try {
      await notificationService.notifyEventSubmission(
        eventId,
        existingEvent.titulo,
        organizador.nombre
      );
    } catch (notificationError) {
      console.error('Error creando notificaciones:', notificationError);
      // No fallar el proceso principal si las notificaciones fallan
    }

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

    // Obtener organizaciones asociadas
    const organizations = await eventRepository.getEventOrganizations(eventId);
    event.organizaciones = organizations;

    // Obtener responsables asociados
    const responsibles = await eventRepository.getEventResponsibles(eventId);
    event.responsables = responsibles;

    return event;
  }

  // Obtener todas las unidades académicas
  async getAllAcademicUnits() {
    const units = await eventRepository.getAllAcademicUnits();
    return units;
  }

  // Obtener eventos por estado con paginación
  async getEventsByStatus(estado, page = 1, limit = 10) {
    // Validar parámetros
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

    const result = await eventRepository.findByStatus(estado, validPage, validLimit);
    return result;
  }

  // Obtener eventos del usuario organizador con filtros
  async getUserEvents(organizadorId, filters = {}) {
    const result = await eventRepository.findByOrganizer(organizadorId, filters);
    return result;
  }

  // Aprobar evento (HU4.1)
  async approveEvent(eventId) {
    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Solo permitir aprobar eventos en estado 'enviado'
    if (existingEvent.estado !== 'enviado') {
      throw new Error('Solo se pueden aprobar eventos en estado "enviado"');
    }

    // Actualizar estado a 'aprobado'
    await eventRepository.updateStatus(eventId, 'aprobado');

    // Marcar notificaciones relacionadas con este evento como leídas
    try {
      await notificationService.markEventNotificationsAsRead(existingEvent.titulo);
    } catch (notificationError) {
      console.error('Error marcando notificaciones como leídas:', notificationError);
      // No fallar el proceso principal si las notificaciones fallan
    }

    // Obtener el evento actualizado
    const updatedEvent = await eventRepository.findById(eventId);
    return updatedEvent;
  }

  // Rechazar evento (HU4.1)
  async rejectEvent(eventId, justificacion) {
    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Solo permitir rechazar eventos en estado 'enviado'
    if (existingEvent.estado !== 'enviado') {
      throw new Error('Solo se pueden rechazar eventos en estado "envió"');
    }

    // Validar que se proporcionó una justificación
    if (!justificacion || justificacion.trim() === '') {
      throw new Error('La justificación del rechazo es obligatoria');
    }

    // Actualizar estado a 'rechazado' con justificación
    await eventRepository.updateStatusWithJustification(eventId, 'rechazado', justificacion.trim());

    // Marcar notificaciones relacionadas con este evento como leídas
    try {
      await notificationService.markEventNotificationsAsRead(existingEvent.titulo);
    } catch (notificationError) {
      console.error('Error marcando notificaciones como leídas:', notificationError);
      // No fallar el proceso principal si las notificaciones fallan
    }

    // Obtener el evento actualizado
    const updatedEvent = await eventRepository.findById(eventId);
    return updatedEvent;
  }

  // Eliminar evento (solo eventos en estado 'borrador')
  async deleteEvent(eventId) {
    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Solo permitir eliminación si el evento está en estado 'borrador'
    if (existingEvent.estado !== 'borrador') {
      throw new Error('Solo se pueden eliminar eventos en estado "borrador"');
    }

    // Eliminar el evento
    const deleted = await eventRepository.delete(eventId);
    if (!deleted) {
      throw new Error('Error al eliminar el evento');
    }

    return { success: true, message: 'Evento eliminado exitosamente' };
  }
}

module.exports = new EventService();
