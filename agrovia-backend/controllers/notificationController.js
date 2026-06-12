const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/notifications
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const filter = { recipient: req.user.id, isDeleted: false };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, isDeleted: false, isRead: false })
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    notifications
  });
});

// GET /api/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
    isDeleted: false
  });

  res.status(200).json({
    success: true,
    unreadCount
  });
});

// PUT /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id, isDeleted: false },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Bildiriş tapılmadı');
  }

  res.status(200).json({
    success: true,
    message: 'Bildiriş oxundu kimi işarələndi',
    notification
  });
});

// PUT /api/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, isRead: false, isDeleted: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: 'Bütün bildirişlər oxundu kimi işarələndi',
    updatedCount: result.modifiedCount
  });
});

// DELETE /api/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Bildiriş tapılmadı');
  }

  res.status(200).json({
    success: true,
    message: 'Bildiriş silindi'
  });
});

// DELETE /api/notifications
exports.clearAllNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, isDeleted: false },
    { isDeleted: true }
  );

  res.status(200).json({
    success: true,
    message: 'Bütün bildirişlər silindi',
    deletedCount: result.modifiedCount
  });
});
