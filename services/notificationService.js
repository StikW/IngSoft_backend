const notificationRepository = require('../repositories/notificationRepository');

class NotificationService {
  // Crear nueva notificación
  async createNotification(notificationData) {
    const {
      usuario_id,
      titulo,
      mensaje
    } = notificationData;

    // Validar campos requeridos
    if (!usuario_id || !titulo || !mensaje) {
      throw new Error('Todos los campos son obligatorios para crear una notificación');
    }

    const notification = await notificationRepository.create({
      usuario_id,
      titulo,
      mensaje
    });

    return notification;
  }

  // Crear notificación para todos los secretarios cuando se envía un evento a validación
  async notifyEventSubmission(eventId, eventTitle, organizerName) {
    try {
      console.log('🔔 Creando notificaciones para evento:', eventId, eventTitle, organizerName);
      
      // Obtener todos los usuarios con rol de secretario (rol_id = 3)
      const secretarios = await notificationRepository.getUsersByRole(3);
      console.log('👥 Secretarios encontrados:', secretarios.length);
      
      const notifications = [];
      
      for (const secretario of secretarios) {
        console.log('📝 Creando notificación para secretario:', secretario.id, secretario.nombre);
        
        const notification = await this.createNotification({
          usuario_id: secretario.id,
          titulo: 'Nuevo evento enviado a validación',
          mensaje: `El evento "${eventTitle}" organizado por ${organizerName} ha sido enviado para su revisión y aprobación.`
        });
        notifications.push(notification);
        console.log('✅ Notificación creada con ID:', notification);
      }

      console.log('🎉 Total notificaciones creadas:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ Error creando notificaciones de envío de evento:', error);
      throw error;
    }
  }

  // Obtener notificaciones de un usuario
  async getUserNotifications(userId, onlyUnread = true) {
    const result = await notificationRepository.findByUserId(userId, onlyUnread);
    return result;
  }

  // Marcar notificación como leída
  async markAsRead(notificationId) {
    await notificationRepository.markAsRead(notificationId);
  }

  // Marcar todas las notificaciones de un usuario como leídas
  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
  }

  // Marcar notificaciones de un evento como leídas cuando se aprueba/rechaza
  async markEventNotificationsAsRead(eventTitle) {
    try {
      console.log('🔔 Marcando notificaciones como leídas para evento:', eventTitle);
      
      const affectedRows = await notificationRepository.markEventNotificationsAsRead(eventTitle);
      console.log('✅ Notificaciones marcadas como leídas:', affectedRows);
      
      return affectedRows;
    } catch (error) {
      console.error('❌ Error marcando notificaciones del evento como leídas:', error);
      throw error;
    }
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(userId) {
    const count = await notificationRepository.getUnreadCount(userId);
    return count;
  }
}

module.exports = new NotificationService();
