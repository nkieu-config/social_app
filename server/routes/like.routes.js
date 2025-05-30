import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Like a post
router.post('/', verifyToken, async (req, res) => {
  try {
    const { postId } = req.body;
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if already liked
    const existingLike = await prisma.like.findFirst({
      where: {
        postId,
        userId: req.user.id
      }
    });
    
    if (existingLike) {
      return res.status(400).json({ message: 'Post already liked' });
    }
    
    // Create like
    const like = await prisma.like.create({
      data: {
        userId: req.user.id,
        postId
      }
    });
    
    // Create notification if like is not from the post owner
    if (post.userId !== req.user.id) {
      const notification = await prisma.notification.create({
        data: {
          type: 'LIKE',
          entityId: postId,
          actorId: req.user.id,
          receivers: {
            create: {
              userId: post.userId
            }
          }
        }
      });
    }
    
    res.status(201).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Error liking post' });
  }
});

// Unlike a post
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Find and delete like
    const like = await prisma.like.findFirst({
      where: {
        postId,
        userId: req.user.id
      }
    });
    
    if (!like) {
      return res.status(404).json({ message: 'Like not found' });
    }
    
    await prisma.like.delete({
      where: { id: like.id }
    });
    
    res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Error unliking post' });
  }
});

// Check if user liked a post
router.get('/:postId/check', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const like = await prisma.like.findFirst({
      where: {
        postId,
        userId: req.user.id
      }
    });
    
    res.status(200).json({ liked: !!like });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ message: 'Error checking like status' });
  }
});

// Get users who liked a post
router.get('/:postId/users', async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Get likes with user info
    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
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
    
    // Get total count for pagination
    const totalLikes = await prisma.like.count({
      where: { postId }
    });
    
    // Extract just the user info
    const users = likes.map(like => like.user);
    
    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        totalLikes,
        totalPages: Math.ceil(totalLikes / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ message: 'Error fetching likes' });
  }
});

export default router;