const notificationService = require('../services/notificationService');

// Obtener notificaciones del usuario autenticado
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { showAll = 'false' } = req.query;
    const onlyUnread = showAll === 'false';

    console.log('🔍 Obteniendo notificaciones para usuario:', userId, 'solo no leídas:', onlyUnread);

    const result = await notificationService.getUserNotifications(userId, onlyUnread);

    console.log('📋 Notificaciones encontradas:', result.notifications?.length || 0);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Marcar notificación como leída
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la notificación pertenece al usuario
    // Obtener todas las notificaciones del usuario para verificar propiedad
    const notifications = await notificationService.getUserNotifications(userId, false);
    const notification = notifications.notifications.find(n => n.id == id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    await notificationService.markAsRead(id);

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Marcar todas las notificaciones como leídas
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });

  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener contador de notificaciones no leídas
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count
      }
    });

  } catch (error) {
    console.error('Error obteniendo contador de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
};
