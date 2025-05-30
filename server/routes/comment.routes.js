import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Add comment to post
router.post('/', verifyToken, async (req, res) => {
  try {
    const { postId, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user.id,
        postId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    // Create notification if comment is not from the post owner
    if (post.userId !== req.user.id) {
      const notification = await prisma.notification.create({
        data: {
          type: 'COMMENT',
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
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Get comments for post
router.get('/post/:postId', async (req, res) => {
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
    
    // Get comments
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
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
    
    // Get total count for pagination
    const totalComments = await prisma.comment.count({
      where: { postId }
    });
    
    res.status(200).json({
      comments,
      pagination: {
        page,
        limit,
        totalComments,
        totalPages: Math.ceil(totalComments / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Update comment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    // Check if comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id }
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }
    
    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete comment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: true }
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Allow comment owner or post owner to delete
    if (comment.userId !== req.user.id && comment.post.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Delete comment
    await prisma.comment.delete({
      where: { id }
    });
    
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

export default router;