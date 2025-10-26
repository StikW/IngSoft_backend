const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} = require('../controllers/notificationController');

// Obtener notificaciones del usuario autenticado
// GET /api/notifications
router.get('/', authenticateToken, getUserNotifications);

// Obtener contador de notificaciones no leídas
// GET /api/notifications/unread-count
router.get('/unread-count', authenticateToken, getUnreadCount);

// Marcar notificación como leída
// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, markNotificationAsRead);

// Marcar todas las notificaciones como leídas
// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', authenticateToken, markAllNotificationsAsRead);

module.exports = router;
