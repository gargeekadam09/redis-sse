const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');

const router = express.Router();

// Send message
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Create message
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content,
      messageType
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'name avatar');

    // Store in Redis for real-time delivery
    const messageData = {
      _id: message._id,
      sender: {
        _id: message.sender._id,
        name: message.sender.name,
        avatar: message.sender.avatar
      },
      receiver: receiverId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      isRead: message.isRead
    };

    // Publish to Redis channel for real-time notifications
    await redisClient.publish(`user:${receiverId}:messages`, JSON.stringify(messageData));

    res.status(201).json(messageData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
router.put('/read/:senderId', auth, async (req, res) => {
  try {
    const { senderId } = req.params;

    await Message.updateMany(
      {
        sender: senderId,
        receiver: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message counts for all conversations
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: req.user._id,
          isRead: false
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    unreadCounts.forEach(item => {
      result[item._id] = item.count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;