const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');

const router = express.Router();


router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }


    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content,
      messageType
    });

    await message.save();


    await message.populate('sender', 'name avatar');


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

  
    await redisClient.publish(`user:${receiverId}:messages`, JSON.stringify(messageData));

    res.status(201).json(messageData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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

// Typing indicator endpoint
router.post('/typing', auth, async (req, res) => {
  try {
    const { receiverId, isTyping } = req.body;

    // Publish typing status via Redis
    await redisClient.publish(`user:${receiverId}:typing`, JSON.stringify({
      userId: req.user._id.toString(),
      userName: req.user.name,
      isTyping
    }));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;