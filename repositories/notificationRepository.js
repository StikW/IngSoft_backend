const { executeQuery } = require('../db');

class NotificationRepository {
  // Crear nueva notificación
  async create(notificationData) {
    const {
      usuario_id,
      titulo,
      mensaje
    } = notificationData;

    const query = `
      INSERT INTO notificaciones (usuario_id, titulo, mensaje)
      VALUES (?, ?, ?)
    `;

    const result = await executeQuery(query, [usuario_id, titulo, mensaje]);
    return result.insertId;
  }

  // Obtener notificaciones de un usuario
  async findByUserId(userId, onlyUnread = false) {
    let dataQuery;
    let countQuery;
    
    if (onlyUnread) {
      // Solo notificaciones no leídas
      dataQuery = `
        SELECT id, titulo, mensaje, leida, fecha_envio
        FROM notificaciones 
        WHERE usuario_id = ? AND leida = FALSE
        ORDER BY fecha_envio DESC
      `;
      
      countQuery = `
        SELECT COUNT(*) as total
        FROM notificaciones 
        WHERE usuario_id = ? AND leida = FALSE
      `;
    } else {
      // Todas las notificaciones
      dataQuery = `
        SELECT id, titulo, mensaje, leida, fecha_envio
        FROM notificaciones 
        WHERE usuario_id = ?
        ORDER BY fecha_envio DESC
      `;
      
      countQuery = `
        SELECT COUNT(*) as total
        FROM notificaciones 
        WHERE usuario_id = ?
      `;
    }
    
    const notifications = await executeQuery(dataQuery, [userId]);
    const countResult = await executeQuery(countQuery, [userId]);
    const total = countResult[0].total;

    return {
      notifications,
      pagination: {
        page: 1,
        limit: notifications.length,
        total,
        pages: 1
      }
    };
  }

  // Marcar notificación como leída
  async markAsRead(notificationId) {
    const query = `
      UPDATE notificaciones 
      SET leida = TRUE 
      WHERE id = ?
    `;
    await executeQuery(query, [notificationId]);
  }

  // Marcar todas las notificaciones de un usuario como leídas
  async markAllAsRead(userId) {
    const query = `
      UPDATE notificaciones 
      SET leida = TRUE 
      WHERE usuario_id = ? AND leida = FALSE
    `;
    await executeQuery(query, [userId]);
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM notificaciones 
      WHERE usuario_id = ? AND leida = FALSE
    `;
    
    const result = await executeQuery(query, [userId]);
    return result[0].count;
  }

  // Obtener usuarios por rol
  async getUsersByRole(roleId) {
    const query = `
      SELECT id, nombre, correo
      FROM usuarios 
      WHERE rol_id = ? AND activo = TRUE
    `;
    
    const users = await executeQuery(query, [roleId]);
    return users;
  }

  // Marcar notificaciones relacionadas con un evento como leídas
  async markEventNotificationsAsRead(eventTitle) {
    const query = `
      UPDATE notificaciones 
      SET leida = TRUE 
      WHERE titulo = 'Nuevo evento enviado a validación' 
      AND mensaje LIKE ?
    `;
    
    const pattern = `%${eventTitle}%`;
    const result = await executeQuery(query, [pattern]);
    return result.affectedRows;
  }

  // Eliminar notificación
  async delete(notificationId) {
    const query = 'DELETE FROM notificaciones WHERE id = ?';
    await executeQuery(query, [notificationId]);
  }
}

module.exports = new NotificationRepository();
