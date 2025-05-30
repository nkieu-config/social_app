import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get user by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, bio, avatar } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        bio,
        avatar
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Update password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

// Search users
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true
      },
      take: 10
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

export default router;