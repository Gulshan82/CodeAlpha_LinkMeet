const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        notifications: [
          {
            _id: new mongoose.Types.ObjectId().toString(),
            receiver: req.user?._id || new mongoose.Types.ObjectId().toString(),
            sender: {
              fullName: 'System Admin',
              profileImage: 'https://ui-avatars.com/api/?name=System+Admin',
            },
            type: 'alert',
            message: 'Welcome! LinkMeet is running in offline demo mode. You can test all communication features live!',
            isRead: false,
            createdAt: new Date(),
          }
        ],
      });
    }
    const notifications = await Notification.find({ receiver: req.user._id })
      .populate('sender', 'fullName email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error loading notifications' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id
// @access  Private
const markAsRead = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        notification: {
          _id: req.params.id,
          isRead: true,
        }
      });
    }
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error marking read' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
