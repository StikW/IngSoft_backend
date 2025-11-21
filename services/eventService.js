const eventRepository = require('../repositories/eventRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');
const lugarService = require('./lugarService');
const { deleteFile } = require('../utils/fileUtils');

class EventService {
  // Crear nuevo evento
  async createEvent(eventData, creadorId) {
    const {
      titulo,
      descripcion,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      lugar_id,
      capacidad_esperada,
      unidades_academicas_ids,
      organizadores_ids,
      organizaciones_externas_ids,
      responsables,
      avales,
      acta_comite_pdf
    } = eventData;

    // Validar fecha y horas
    if (!fecha) {
      throw new Error('La fecha es obligatoria');
    }
    if (!hora_inicio || !hora_fin) {
      throw new Error('Las horas de inicio y fin son obligatorias');
    }
    if (hora_inicio >= hora_fin) {
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }

    // Verificar que el lugar existe
    if (!lugar_id) {
      throw new Error('El lugar es obligatorio');
    }
    const lugar = await lugarService.getLugarById(lugar_id);
    if (!lugar) {
      throw new Error('Lugar no encontrado');
    }

    // Validar capacidad esperada
    if (!capacidad_esperada || capacidad_esperada <= 0) {
      throw new Error('La capacidad esperada debe ser mayor a 0');
    }
    if (capacidad_esperada > lugar.capacidad_max) {
      throw new Error(`La capacidad esperada (${capacidad_esperada}) no puede superar la capacidad máxima del lugar (${lugar.capacidad_max})`);
    }

    // Validar unidades académicas (obligatorias, al menos una)
    if (!unidades_academicas_ids || !Array.isArray(unidades_academicas_ids) || unidades_academicas_ids.length === 0) {
      throw new Error('Debe seleccionar al menos una unidad académica');
    }
    for (const unitId of unidades_academicas_ids) {
      const unitExists = await eventRepository.verifyUnitExists(unitId);
      if (!unitExists) {
        throw new Error(`Unidad académica con ID ${unitId} no encontrada`);
      }
    }

    // Validar que se proporcione al menos una organización externa
    if (!organizaciones_externas_ids || !Array.isArray(organizaciones_externas_ids) || organizaciones_externas_ids.length === 0) {
      throw new Error('Debe seleccionar al menos una organización externa');
    }

    // Verificar que las organizaciones externas existen
    for (const orgId of organizaciones_externas_ids) {
      const orgExists = await eventRepository.verifyOrganizationExists(orgId);
      if (!orgExists) {
        throw new Error(`Organización externa con ID ${orgId} no encontrada`);
      }
    }

    // Crear el evento
    const eventId = await eventRepository.create({
      titulo,
      descripcion,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      lugar_id,
      capacidad_esperada,
      acta_comite_pdf
    });

    // Agregar creador como organizador automáticamente
    await eventRepository.addOrganizerToEvent(eventId, creadorId);

    // Agregar otros organizadores si se proporcionan
    if (organizadores_ids && Array.isArray(organizadores_ids)) {
      for (const orgId of organizadores_ids) {
        if (orgId !== creadorId) { // Evitar duplicados
          await eventRepository.addOrganizerToEvent(eventId, orgId);
        }
      }
    }

    // Asociar unidades académicas al evento (relación N:M)
    for (const unitId of unidades_academicas_ids) {
      await eventRepository.addAcademicUnitToEvent(eventId, unitId);
    }

    // Validar y asociar responsables al evento (relación N:M con unidad_academica_id)
    if (!responsables || !Array.isArray(responsables) || responsables.length === 0) {
      throw new Error('Debe proporcionar al menos un responsable');
    }

    // Validar que haya al menos un responsable por cada unidad académica
    const unidadesConResponsables = new Set();
    for (const responsable of responsables) {
      if (!responsable.usuario_id || !responsable.unidad_academica_id || !responsable.rol_responsable) {
        throw new Error('Cada responsable debe tener usuario_id, unidad_academica_id y rol_responsable');
      }
      // Verificar que la unidad del responsable esté en las unidades del evento
      if (!unidades_academicas_ids.includes(parseInt(responsable.unidad_academica_id))) {
        throw new Error(`El responsable tiene una unidad académica (${responsable.unidad_academica_id}) que no está asociada al evento`);
      }
      unidadesConResponsables.add(parseInt(responsable.unidad_academica_id));
    }

    // Verificar que todas las unidades tengan al menos un responsable
    for (const unitId of unidades_academicas_ids) {
      if (!unidadesConResponsables.has(parseInt(unitId))) {
        throw new Error(`Debe haber al menos un responsable para la unidad académica con ID ${unitId}`);
      }
    }

    // Asociar responsables
    for (const responsable of responsables) {
      await eventRepository.addResponsibleToEvent(
        eventId,
        responsable.usuario_id,
        responsable.unidad_academica_id,
        responsable.rol_responsable
      );
    }

    // Asociar organizaciones externas al evento (relación N:M)
    for (const orgId of organizaciones_externas_ids) {
      await eventRepository.addOrganizationToEvent(eventId, orgId);
    }

    // Obtener organizadores para validar avales
    const organizadores = await eventRepository.getEventOrganizers(eventId);
    
    // Validar y crear avales según reglas
    await this._validateAndCreateAvales(eventId, organizadores, unidades_academicas_ids, avales);

    // Obtener el evento creado con información completa
    const newEvent = await eventRepository.findById(eventId);
    return newEvent;
  }

  // Método auxiliar para validar y crear avales
  async _validateAndCreateAvales(eventId, organizadores, unidadesIds, avales) {
    if (!organizadores || organizadores.length === 0) {
      throw new Error('El evento debe tener al menos un organizador');
    }

    // Obtener programas únicos de organizadores estudiantes
    const programasEstudiantes = new Set();
    const organizadoresDocentes = [];
    
    for (const org of organizadores) {
      if (org.rol_id === 1) { // Estudiante
        if (org.programa_id) {
          programasEstudiantes.add(org.programa_id);
        }
      } else if (org.rol_id === 2) { // Docente
        organizadoresDocentes.push(org);
      }
    }

    // Si hay estudiantes, validar avales por programa
    if (programasEstudiantes.size > 0) {
      if (!avales || !Array.isArray(avales) || avales.length === 0) {
        throw new Error('Debe proporcionar al menos un aval para los programas académicos de los organizadores');
      }

      // Validar que haya un aval por cada programa único
      const programasConAval = new Set();
      for (const aval of avales) {
        if (!aval.programa_id || !aval.archivo_pdf) {
          throw new Error('Cada aval debe tener programa_id y archivo_pdf');
        }
        if (!programasEstudiantes.has(parseInt(aval.programa_id))) {
          throw new Error(`El aval tiene un programa_id (${aval.programa_id}) que no corresponde a ningún organizador estudiante`);
        }
        programasConAval.add(parseInt(aval.programa_id));
      }

      // Verificar que todos los programas tengan aval
      for (const progId of programasEstudiantes) {
        if (!programasConAval.has(progId)) {
          throw new Error(`Debe proporcionar un aval para el programa académico con ID ${progId}`);
        }
      }

      // Crear avales
      for (const aval of avales) {
        await eventRepository.addAvalToEvent(eventId, aval.programa_id, null, aval.archivo_pdf);
      }
    }

    // Si hay docentes, validar avales por unidad académica
    if (organizadoresDocentes.length > 0) {
      if (!avales || !Array.isArray(avales) || avales.length === 0) {
        throw new Error('Debe proporcionar al menos un aval para las unidades académicas del evento');
      }

      // Validar que haya un aval por cada unidad del evento
      const unidadesConAval = new Set();
      for (const aval of avales) {
        if (!aval.unidad_academica_id || !aval.archivo_pdf) {
          throw new Error('Cada aval debe tener unidad_academica_id y archivo_pdf');
        }
        if (!unidadesIds.includes(parseInt(aval.unidad_academica_id))) {
          throw new Error(`El aval tiene una unidad_academica_id (${aval.unidad_academica_id}) que no está asociada al evento`);
        }
        unidadesConAval.add(parseInt(aval.unidad_academica_id));
      }

      // Verificar que todas las unidades tengan aval
      for (const unitId of unidadesIds) {
        if (!unidadesConAval.has(parseInt(unitId))) {
          throw new Error(`Debe proporcionar un aval para la unidad académica con ID ${unitId}`);
        }
      }

      // Crear avales (solo los que tienen unidad_academica_id)
      for (const aval of avales) {
        if (aval.unidad_academica_id) {
          await eventRepository.addAvalToEvent(eventId, null, aval.unidad_academica_id, aval.archivo_pdf);
        }
      }
    }
  }

  // Actualizar evento
  async updateEvent(eventId, updateData, updateRelations = {}, userId = null) {
    const {
      organizaciones_externas_ids,
      unidades_academicas_ids,
      organizadores_ids,
      responsables,
      avales
    } = updateRelations;

    // Verificar que el evento existe
    const existingEvent = await eventRepository.findBasicById(eventId);
    
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario es el creador del evento (si se proporciona userId)
    if (userId) {
      const creator = await eventRepository.getEventCreator(eventId);
      if (!creator || creator.usuario_id !== userId) {
        throw new Error('No tienes permisos para editar este evento. Solo el creador puede editarlo.');
      }
    }

    // Solo permitir edición si el evento está en estado 'borrador', 'enviado' o 'rechazado'
    if (!['borrador', 'enviado', 'rechazado'].includes(existingEvent.estado)) {
      throw new Error('Solo se pueden editar eventos en estado "borrador", "enviado" o "rechazado"');
    }

    // Validar horas si se actualizan
    if (updateData.hora_inicio && updateData.hora_fin) {
      if (updateData.hora_inicio >= updateData.hora_fin) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
    } else if (updateData.hora_inicio || updateData.hora_fin) {
      // Si solo se actualiza una hora, validar contra la existente
      const horaInicio = updateData.hora_inicio || existingEvent.hora_inicio;
      const horaFin = updateData.hora_fin || existingEvent.hora_fin;
      if (horaInicio >= horaFin) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
    }

    // Validar capacidad esperada si se actualiza lugar_id o capacidad_esperada
    if (updateData.lugar_id || updateData.capacidad_esperada !== undefined) {
      const lugarId = updateData.lugar_id || existingEvent.lugar_id;
      const capacidadEsperada = updateData.capacidad_esperada !== undefined ? updateData.capacidad_esperada : existingEvent.capacidad_esperada;
      
      if (lugarId && capacidadEsperada) {
        const lugar = await lugarService.getLugarById(lugarId);
        if (!lugar) {
          throw new Error('Lugar no encontrado');
        }
        if (capacidadEsperada > lugar.capacidad_max) {
          throw new Error(`La capacidad esperada (${capacidadEsperada}) no puede superar la capacidad máxima del lugar (${lugar.capacidad_max})`);
        }
      }
    }

    // Obtener datos completos antes de actualizar para eliminar archivos antiguos
    const fullBefore = await eventRepository.findById(eventId);
    const avalesAntiguos = await eventRepository.getEventAvales(eventId);

    // Si se reemplaza acta_comite_pdf, eliminar el anterior
    if (updateData.acta_comite_pdf && fullBefore && fullBefore.acta_comite_pdf && updateData.acta_comite_pdf !== fullBefore.acta_comite_pdf) {
      try {
        await deleteFile(fullBefore.acta_comite_pdf);
      } catch (fileDeleteError) {
        console.error('Error eliminando acta_comite_pdf anterior:', fileDeleteError);
      }
    }

    // Actualizar el evento
    await eventRepository.update(eventId, updateData);

    // Obtener unidades académicas actuales o las nuevas
    let unidadesFinales = unidades_academicas_ids;
    if (!unidadesFinales) {
      const unidadesActuales = await eventRepository.getEventAcademicUnits(eventId);
      unidadesFinales = unidadesActuales.map(u => u.unidad_academica_id);
    }

    // Actualizar unidades académicas si se proporcionan
    if (Array.isArray(unidades_academicas_ids)) {
      // Verificar que existan
      for (const unitId of unidades_academicas_ids) {
        const unitExists = await eventRepository.verifyUnitExists(unitId);
        if (!unitExists) {
          throw new Error(`Unidad académica con ID ${unitId} no encontrada`);
        }
      }
      await eventRepository.removeAllAcademicUnitsFromEvent(eventId);
      for (const unitId of unidades_academicas_ids) {
        await eventRepository.addAcademicUnitToEvent(eventId, unitId);
      }
      unidadesFinales = unidades_academicas_ids;
    }

    // Actualizar organizadores si se proporcionan
    if (Array.isArray(organizadores_ids)) {
      // Verificar que existan
      for (const orgId of organizadores_ids) {
        const user = await userRepository.findById(orgId);
        if (!user) {
          throw new Error(`Usuario organizador con ID ${orgId} no encontrado`);
        }
        // Solo permitir estudiantes o docentes como organizadores
        if (user.rol_id !== 1 && user.rol_id !== 2) {
          throw new Error(`El usuario con ID ${orgId} no puede ser organizador (debe ser estudiante o docente)`);
        }
      }
      await eventRepository.removeAllOrganizersFromEvent(eventId);
      for (const orgId of organizadores_ids) {
        await eventRepository.addOrganizerToEvent(eventId, orgId);
      }
    }

    // Actualizar responsables si se proporcionan
    if (Array.isArray(responsables)) {
      // Validar que haya al menos un responsable por cada unidad académica
      const unidadesConResponsables = new Set();
      for (const responsable of responsables) {
        if (!responsable.usuario_id || !responsable.unidad_academica_id || !responsable.rol_responsable) {
          throw new Error('Cada responsable debe tener usuario_id, unidad_academica_id y rol_responsable');
        }
        // Verificar que la unidad del responsable esté en las unidades del evento
        if (!unidadesFinales.includes(parseInt(responsable.unidad_academica_id))) {
          throw new Error(`El responsable tiene una unidad académica (${responsable.unidad_academica_id}) que no está asociada al evento`);
        }
        unidadesConResponsables.add(parseInt(responsable.unidad_academica_id));
      }

      // Verificar que todas las unidades tengan al menos un responsable
      for (const unitId of unidadesFinales) {
        if (!unidadesConResponsables.has(parseInt(unitId))) {
          throw new Error(`Debe haber al menos un responsable para la unidad académica con ID ${unitId}`);
        }
      }

      // Eliminar responsables antiguos y agregar nuevos
      await eventRepository.removeAllResponsiblesFromEvent(eventId);
      for (const responsable of responsables) {
        await eventRepository.addResponsibleToEvent(
          eventId,
          responsable.usuario_id,
          responsable.unidad_academica_id,
          responsable.rol_responsable
        );
      }
    }

    // Actualizar organizaciones externas si se proporcionan
    if (Array.isArray(organizaciones_externas_ids)) {
      // Verificar que existan
      for (const orgId of organizaciones_externas_ids) {
        const exists = await eventRepository.verifyOrganizationExists(orgId);
        if (!exists) {
          throw new Error(`Organización externa con ID ${orgId} no encontrada`);
        }
      }
      await eventRepository.removeAllOrganizationsFromEvent(eventId);
      for (const orgId of organizaciones_externas_ids) {
        await eventRepository.addOrganizationToEvent(eventId, orgId);
      }
    }

    // Actualizar avales si se proporcionan
    if (Array.isArray(avales)) {
      // Eliminar avales antiguos (y sus archivos)
      for (const avalAntiguo of avalesAntiguos) {
        if (avalAntiguo.archivo_pdf) {
          try {
            await deleteFile(avalAntiguo.archivo_pdf);
          } catch (fileDeleteError) {
            console.error('Error eliminando aval anterior:', fileDeleteError);
          }
        }
      }
      await eventRepository.removeAllAvalesFromEvent(eventId);

      // Obtener organizadores actuales para validar avales
      const organizadores = await eventRepository.getEventOrganizers(eventId);
      await this._validateAndCreateAvales(eventId, organizadores, unidadesFinales, avales);
    }

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
    const requiredFields = ['titulo', 'descripcion', 'fecha', 'hora_inicio', 'hora_fin', 'lugar_id'];
    const missingFields = requiredFields.filter(field => {
      const value = existingEvent[field];
      // Para campos de fecha/hora, solo verificar que existan
      if (field === 'fecha' || field === 'hora_inicio' || field === 'hora_fin') {
        return !value;
      }
      // Para campos de texto, verificar que no estén vacíos
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      throw new Error(`El evento debe tener todos los campos requeridos antes de enviarse a validación. Faltan: ${missingFields.join(', ')}`);
    }

    // Obtener organizadores del evento
    const organizers = await eventRepository.getEventOrganizers(eventId);
    if (!organizers || organizers.length === 0) {
      throw new Error('El evento debe tener al menos un organizador');
    }

    // Actualizar estado a 'enviado'
    await eventRepository.updateStatus(eventId, 'enviado');

    // Obtener información del primer organizador para la notificación
    const primerOrganizador = organizers[0];
    const organizador = await userRepository.findById(primerOrganizador.usuario_id);
    
    if (!organizador) {
      console.error('❌ Error: No se encontró el organizador con ID:', primerOrganizador.usuario_id);
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

    // Obtener organizadores asociados
    const organizers = await eventRepository.getEventOrganizers(eventId);
    event.organizadores = organizers;

    // Obtener unidades académicas asociadas
    const academicUnits = await eventRepository.getEventAcademicUnits(eventId);
    event.unidades_academicas = academicUnits;

    // Obtener organizaciones externas asociadas
    const organizations = await eventRepository.getEventOrganizations(eventId);
    event.organizaciones = organizations;

    // Obtener responsables asociados
    const responsibles = await eventRepository.getEventResponsibles(eventId);
    event.responsables = responsibles;

    // Obtener avales asociados
    const avales = await eventRepository.getEventAvales(eventId);
    event.avales = avales;

    return event;
  }

  // Obtener todas las unidades académicas
  async getAllAcademicUnits() {
    const units = await eventRepository.getAllAcademicUnits();
    return units;
  }

  // Obtener usuarios por rol (para seleccionar responsables)
  async getUsersByRole(rolId) {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.rol_id,
        r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.rol_id = ? AND u.activo = 1
      ORDER BY u.nombre
    `;
    const users = await require('../db').executeQuery(query, [rolId]);
    return users;
  }

  // Obtener eventos por estado (sin paginación)
  async getEventsByStatus(estado) {
    const events = await eventRepository.findByStatus(estado);
    return events;
  }

  // Obtener eventos del usuario organizador con filtros (sin paginación)
  async getUserEvents(organizadorId, filters = {}) {
    const events = await eventRepository.findByOrganizer(organizadorId, filters);
    return events;
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

    // Intentar eliminar archivos asociados si existen
    try {
      const fullEvent = await eventRepository.findById(eventId);
      if (fullEvent) {
        if (fullEvent.acta_comite_pdf) {
          await deleteFile(fullEvent.acta_comite_pdf);
        }
      }
      // Eliminar avales (los archivos se eliminan por CASCADE, pero eliminamos los registros)
      const avales = await eventRepository.getEventAvales(eventId);
      for (const aval of avales) {
        if (aval.archivo_pdf) {
          await deleteFile(aval.archivo_pdf);
        }
      }
    } catch (fileDeleteError) {
      console.error('Error eliminando archivos asociados al evento:', fileDeleteError);
      // No impedir la eliminación del registro si el borrado de archivos falla
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
