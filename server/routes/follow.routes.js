import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Follow a user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { followingId } = req.body;
    
    // Can't follow yourself
    if (followingId === req.user.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    // Check if user to follow exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already following
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: req.user.id,
        followingId
      }
    });
    
    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }
    
    // Create follow
    const follow = await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId
      }
    });
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type: 'FOLLOW',
        actorId: req.user.id,
        receivers: {
          create: {
            userId: followingId
          }
        }
      }
    });
    
    res.status(201).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user' });
  }
});

// Unfollow a user
router.delete('/:followingId', verifyToken, async (req, res) => {
  try {
    const { followingId } = req.params;
    
    // Find follow relationship
    const follow = await prisma.follow.findFirst({
      where: {
        followerId: req.user.id,
        followingId
      }
    });
    
    if (!follow) {
      return res.status(404).json({ message: 'Not following this user' });
    }
    
    // Delete follow
    await prisma.follow.delete({
      where: { id: follow.id }
    });
    
    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

// Check if user is following another user
router.get('/:followingId/check', verifyToken, async (req, res) => {
  try {
    const { followingId } = req.params;
    
    const follow = await prisma.follow.findFirst({
      where: {
        followerId: req.user.id,
        followingId
      }
    });
    
    res.status(200).json({ following: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ message: 'Error checking follow status' });
  }
});

// Get followers of a user
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
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
    const totalFollowers = await prisma.follow.count({
      where: { followingId: userId }
    });
    
    // Extract just the user info
    const users = followers.map(follow => follow.follower);
    
    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        totalFollowers,
        totalPages: Math.ceil(totalFollowers / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Error fetching followers' });
  }
});

// Get users followed by a user
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get following
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
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
    const totalFollowing = await prisma.follow.count({
      where: { followerId: userId }
    });
    
    // Extract just the user info
    const users = following.map(follow => follow.following);
    
    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        totalFollowing,
        totalPages: Math.ceil(totalFollowing / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ message: 'Error fetching following' });
  }
});

export default router;