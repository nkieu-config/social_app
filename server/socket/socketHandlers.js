import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Store active connections
const activeConnections = new Map();

export const setupSocketHandlers = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Set user data on socket
      socket.user = {
        id: decoded.id,
        username: decoded.username
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    
    console.log(`User connected: ${userId}`);
    
    // Store connection
    activeConnections.set(userId, socket.id);
    
    // Broadcast online status
    io.emit('user:status', {
      userId,
      status: 'online'
    });
    
    // Join user's room for private messages
    socket.join(`user:${userId}`);
    
    // Handle private messages
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content } = data;
        
        // Save message to database
        const message = await prisma.message.create({
          data: {
            content,
            senderId: userId,
            receiverId
          },
          include: {
            sender: {
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
            actorId: userId,
            receivers: {
              create: {
                userId: receiverId
              }
            }
          }
        });
        
        // Send to receiver if online
        socket.to(`user:${receiverId}`).emit('message:receive', message);
        
        // Emit notification update
        socket.to(`user:${receiverId}`).emit('notification:new');
      } catch (error) {
        console.error('Socket message error:', error);
      }
    });
    
    // Handle read receipts
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        
        // Update message in database
        await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true }
        });
        
        // Get message to find sender
        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });
        
        if (message) {
          // Notify sender that message was read
          socket.to(`user:${message.senderId}`).emit('message:read', {
            messageId
          });
        }
      } catch (error) {
        console.error('Socket read receipt error:', error);
      }
    });
    
    // Handle typing indicators
    socket.on('message:typing', (data) => {
      const { receiverId, isTyping } = data;
      
      socket.to(`user:${receiverId}`).emit('message:typing', {
        userId,
        isTyping
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      
      // Remove from active connections
      activeConnections.delete(userId);
      
      // Broadcast offline status
      io.emit('user:status', {
        userId,
        status: 'offline'
      });
    });
  });
  
  // Function to check if user is online
  const isUserOnline = (userId) => {
    return activeConnections.has(userId);
  };
  
  // Expose online status check
  io.isUserOnline = isUserOnline;
};