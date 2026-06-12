const Notification = require('../models/Notification');

/**
 * Create a notification record. Never throws — notification failure must not
 * break the calling action. All params are optional except recipient, type,
 * title, and message.
 */
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  relatedOrder,
  relatedProduct,
  relatedReview
}) => {
  try {
    await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedOrder,
      relatedProduct,
      relatedReview
    });
  } catch (err) {
    console.error('Bildiriş yaradılarkən xəta:', err.message);
  }
};

module.exports = createNotification;
