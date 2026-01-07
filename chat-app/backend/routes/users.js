const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');

const router = express.Router();

// Get all users with online status
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name email avatar isOnline lastSeen')
      .sort({ name: 1 });

    // Check Redis for real-time online status
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const isOnlineRedis = await redisClient.get(`user:${user._id}:online`);
        return {
          ...user.toObject(),
          isOnline: !!isOnlineRedis || user.isOnline
        };
      })
    );

    res.json(usersWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user conversations with last message
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get all users the current user has chatted with
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            avatar: '$user.avatar',
            isOnline: '$user.isOnline',
            lastSeen: '$user.lastSeen'
          },
          lastMessage: '$lastMessage',
          unreadCount: '$unreadCount'
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Update online status from Redis
    const conversationsWithStatus = await Promise.all(
      conversations.map(async (conv) => {
        const isOnlineRedis = await redisClient.get(`user:${conv.user._id}:online`);
        return {
          ...conv,
          user: {
            ...conv.user,
            isOnline: !!isOnlineRedis || conv.user.isOnline
          }
        };
      })
    );

    res.json(conversationsWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true }
    ).select('-password');

    res.json({
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        isOnline: updatedUser.isOnline
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;