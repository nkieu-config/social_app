import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Send a message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });
    
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: req.user.id,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type: 'MESSAGE',
        actorId: req.user.id,
        receivers: {
          create: {
            userId: receiverId
          }
        }
      }
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: userId
          },
          {
            senderId: userId,
            receiverId: req.user.id
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });
    
    // Get total count for pagination
    const totalMessages = await prisma.message.count({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: userId
          },
          {
            senderId: userId,
            receiverId: req.user.id
          }
        ]
      }
    });
    
    res.status(200).json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Error fetching conversation' });
  }
});

// Get list of conversations (users who have exchanged messages with current user)
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    // Get all users who have exchanged messages with current user
    const conversations = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u.username, 
        u.avatar,
        u."fullName",
        m.content as last_message_content,
        m."createdAt" as last_message_time,
        m."senderId" as last_message_sender,
        (
          SELECT COUNT(*)::int 
          FROM messages 
          WHERE "senderId" = u.id 
          AND "receiverId" = ${req.user.id}
          AND "isRead" = false
        ) as unread_count
      FROM users u
      JOIN (
        SELECT DISTINCT
          CASE
            WHEN "senderId" = ${req.user.id} THEN "receiverId"
            ELSE "senderId"
          END as user_id
        FROM messages
        WHERE "senderId" = ${req.user.id} OR "receiverId" = ${req.user.id}
      ) conv ON u.id = conv.user_id
      LEFT JOIN LATERAL (
        SELECT content, "createdAt", "senderId"
        FROM messages
        WHERE ("senderId" = ${req.user.id} AND "receiverId" = u.id)
        OR ("senderId" = u.id AND "receiverId" = ${req.user.id})
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) m ON true
      ORDER BY m."createdAt" DESC
    `;
    
    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get unread message count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user.id,
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