import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get notifications for user
    const notificationReceivers = await prisma.notificationReceiver.findMany({
      where: { userId: req.user.id },
      include: {
        notification: {
          include: {
            // Include the actor who triggered the notification
            // Need raw query because Prisma doesn't support optional relations yet
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Get actors (users who triggered notifications)
    const actorIds = notificationReceivers
      .map(nr => nr.notification.actorId)
      .filter(id => id); // Filter out null values
    
    // Get users by their IDs
    const actors = actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: {
            id: true,
            username: true,
            avatar: true
          }
        })
      : [];
    
    // Get entities (posts, comments) related to notifications
    const entityIds = notificationReceivers
      .map(nr => nr.notification.entityId)
      .filter(id => id); // Filter out null values
    
    // Get posts by their IDs (we only track post IDs for now)
    const entities = entityIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: entityIds } },
          select: {
            id: true,
            content: true,
            imageUrl: true
          }
        })
      : [];
    
    // Combine data
    const notifications = notificationReceivers.map(nr => {
      const notification = nr.notification;
      const actor = actors.find(a => a.id === notification.actorId);
      const entity = entities.find(e => e.id === notification.entityId);
      
      return {
        id: nr.id,
        notificationId: notification.id,
        type: notification.type,
        isRead: nr.isRead,
        createdAt: nr.createdAt,
        actor,
        entity
      };
    });
    
    // Get total count for pagination
    const totalNotifications = await prisma.notificationReceiver.count({
      where: { userId: req.user.id }
    });
    
    res.status(200).json({
      notifications,
      pagination: {
        page,
        limit,
        totalNotifications,
        totalPages: Math.ceil(totalNotifications / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if notification exists and belongs to user
    const notification = await prisma.notificationReceiver.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Mark as read
    await prisma.notificationReceiver.update({
      where: { id },
      data: { isRead: true }
    });
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    // Mark all user's notifications as read
    await prisma.notificationReceiver.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Get unread notification count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const count = await prisma.notificationReceiver.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });
    
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

export default router;