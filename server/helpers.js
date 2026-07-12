const { Notification, ActivityLog } = require('./models');

/**
 * Fire-and-forget notification creator.
 * @param {string} userId - Target user's ObjectId
 * @param {string} type - Notification type (e.g. 'allocation', 'transfer', 'booking', 'maintenance', 'audit')
 * @param {string} message - Human-readable message
 * @param {{ entityType: string, entityId: string }} [relatedEntity] - Optional related entity
 */
function createNotification(userId, type, message, relatedEntity) {
  Notification.create({ userId, type, message, relatedEntity, read: false })
    .catch((err) => console.error('Notification error:', err.message));
}

/**
 * Fire-and-forget activity log creator.
 * @param {string} userId - Acting user's ObjectId
 * @param {string} action - Action description (e.g. 'Created Allocation')
 * @param {string} entityType - Entity type (e.g. 'Allocation', 'Asset')
 * @param {string} entityId - Entity ObjectId
 * @param {string} [ipAddress] - Request IP
 */
function createActivityLog(userId, action, entityType, entityId, ipAddress) {
  ActivityLog.create({ userId, action, entityType, entityId, timestamp: new Date(), ipAddress })
    .catch((err) => console.error('ActivityLog error:', err.message));
}

module.exports = { createNotification, createActivityLog };
