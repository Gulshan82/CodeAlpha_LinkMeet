const Message = require('../models/Message');
const mongoose = require('mongoose');

// @desc    Save a new chat message
// @route   POST /api/messages
// @access  Private
const saveMessage = async (req, res) => {
  try {
    const { meetingId, message } = req.body;

    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        success: true,
        message: {
          _id: new mongoose.Types.ObjectId().toString(),
          sender: {
            _id: req.user?._id || new mongoose.Types.ObjectId().toString(),
            fullName: req.user?.fullName || 'Demo User',
            profileImage: req.user?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          },
          meetingId,
          message,
          timestamp: new Date(),
        }
      });
    }

    if (!meetingId || !message) {
      return res.status(400).json({ success: false, message: 'Please provide meetingId and message content' });
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      meetingId,
      message,
      timestamp: new Date(),
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'fullName email profileImage');

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error saving message' });
  }
};

// @desc    Get all chat messages for a meeting
// @route   GET /api/messages/:meetingId
// @access  Private
const getMessagesByMeeting = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        messages: [
          {
            _id: new mongoose.Types.ObjectId().toString(),
            sender: {
              _id: new mongoose.Types.ObjectId().toString(),
              fullName: 'Demo Colleague',
              profileImage: 'https://ui-avatars.com/api/?name=Demo+Colleague',
            },
            meetingId: req.params.meetingId,
            message: 'Hello! Welcome to the offline room demo.',
            timestamp: new Date(),
          }
        ],
      });
    }

    const messages = await Message.find({ meetingId: req.params.meetingId })
      .populate('sender', 'fullName email profileImage')
      .sort({ timestamp: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error retrieving messages' });
  }
};

module.exports = {
  saveMessage,
  getMessagesByMeeting,
};
