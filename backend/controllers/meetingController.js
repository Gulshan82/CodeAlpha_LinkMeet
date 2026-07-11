const Meeting = require('../models/Meeting');
const mongoose = require('mongoose');

// Helper to generate UUID-like short room IDs (e.g. abc-defg-hij)
const generateMeetingId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

// @desc    Create a new meeting
// @route   POST /api/meetings/create
// @access  Private
const createMeeting = async (req, res) => {
  try {
    const meetingId = generateMeetingId();

    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        success: true,
        meeting: {
          meetingId,
          host: req.user?._id || new mongoose.Types.ObjectId(),
          participants: [req.user?._id || new mongoose.Types.ObjectId()],
          startTime: new Date(),
        },
      });
    }
    const meeting = await Meeting.create({
      meetingId,
      host: req.user._id,
      participants: [req.user._id],
      startTime: new Date(),
    });

    res.status(201).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error creating meeting' });
  }
};

// @desc    Get user's meetings list (history)
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        meetings: [
          {
            _id: new mongoose.Types.ObjectId(),
            meetingId: 'mock-sprint-planning',
            host: {
              _id: req.user?._id || new mongoose.Types.ObjectId(),
              fullName: req.user?.fullName || 'Demo User',
              email: req.user?.email || 'demo@example.com',
              profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            },
            participants: [],
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(),
          }
        ],
      });
    }
    // Find meetings where the user was the host or in the participant list
    const meetings = await Meeting.find({
      $or: [{ host: req.user._id }, { participants: req.user._id }],
    })
      .populate('host', 'fullName email profileImage')
      .populate('participants', 'fullName email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error retrieving history' });
  }
};

// @desc    Get details of a specific meeting by meetingId string (e.g. abc-defg-hij)
// @route   GET /api/meetings/:id
// @access  Private
const getMeetingById = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        meeting: {
          _id: new mongoose.Types.ObjectId(),
          meetingId: req.params.id,
          host: {
            _id: req.user?._id || new mongoose.Types.ObjectId(),
            fullName: 'Demo Organizer',
            email: 'organizer@example.com',
            profileImage: 'https://ui-avatars.com/api/?name=Demo+Organizer',
          },
          participants: [
            {
              _id: req.user?._id || new mongoose.Types.ObjectId(),
              fullName: req.user?.fullName || 'Demo User',
              email: req.user?.email || 'demo@example.com',
              profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            }
          ],
          startTime: new Date(),
        },
      });
    }
    const meeting = await Meeting.findOne({ meetingId: req.params.id })
      .populate('host', 'fullName email profileImage')
      .populate('participants', 'fullName email profileImage');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Add user as a participant if not already in list
    if (!meeting.participants.some(p => p._id.toString() === req.user._id.toString())) {
      meeting.participants.push(req.user._id);
      await Meeting.updateOne(
        { _id: meeting._id },
        { $addToSet: { participants: req.user._id } }
      );
    }

    res.json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching meeting' });
  }
};

// @desc    Delete/End a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.id });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Only host can delete/end a meeting record
    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to close this meeting' });
    }

    meeting.endTime = new Date();
    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting ended successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error closing meeting' });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  deleteMeeting,
};
