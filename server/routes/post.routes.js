import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create a post
router.post('/', verifyToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    
    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Post must have content or image' });
    }
    
    const post = await prisma.post.create({
      data: {
        content: content || '',
        imageUrl,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get post by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true
          }
        },
        comments: {
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
          take: 10
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.status(200).json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// Update a post
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    
    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }
    
    // Update post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        content,
        imageUrl
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
    
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error updating post' });
  }
});

// Delete a post
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }
    
    // Delete post
    await prisma.post.delete({
      where: { id }
    });
    
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

// Get feed posts (posts from followed users)
router.get('/feed/following', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get IDs of users the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });
    
    const followingIds = following.map(f => f.followingId);
    
    // Add current user's ID to see their own posts too
    followingIds.push(req.user.id);
    
    // Get posts from followed users
    const posts = await prisma.post.findMany({
      where: {
        userId: { in: followingIds }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
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
    const totalPosts = await prisma.post.count({
      where: {
        userId: { in: followingIds }
      }
    });
    
    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ message: 'Error fetching feed' });
  }
});

// Get explore posts (trending or recent posts from users not followed)
router.get('/explore/discover', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get IDs of users the current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });
    
    const followingIds = following.map(f => f.followingId);
    
    // Add current user's ID to exclude their posts too
    followingIds.push(req.user.id);
    
    // Get posts NOT from followed users
    const posts = await prisma.post.findMany({
      where: {
        userId: { notIn: followingIds }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: [
        // Order by most liked and commented first (trending)
        {
          likes: {
            _count: 'desc'
          }
        },
        {
          comments: {
            _count: 'desc'
          }
        },
        {
          createdAt: 'desc'
        }
      ],
      skip,
      take: limit
    });
    
    // Get total count for pagination
    const totalPosts = await prisma.post.count({
      where: {
        userId: { notIn: followingIds }
      }
    });
    
    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching explore posts:', error);
    res.status(500).json({ message: 'Error fetching explore posts' });
  }
});

// Get user posts
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user posts
    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
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
    const totalPosts = await prisma.post.count({
      where: { userId: user.id }
    });
    
    res.status(200).json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
});

export default router;