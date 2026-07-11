const File = require('../models/File');
const mongoose = require('mongoose');

// @desc    Upload a file in a meeting
// @route   POST /api/files/upload
// @access  Private
const uploadFile = async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Please specify a meeting ID' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let fileUrl = '';
    if (req.file.path) {
      // Cloudinary path
      fileUrl = req.file.path;
    } else {
      // Local fallback path
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({
        success: true,
        file: {
          _id: new mongoose.Types.ObjectId().toString(),
          meetingId,
          uploadedBy: {
            _id: req.user?._id || new mongoose.Types.ObjectId().toString(),
            fullName: req.user?.fullName || 'Demo User',
            profileImage: req.user?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          },
          fileName: req.file.originalname,
          fileUrl,
          uploadedAt: new Date(),
        }
      });
    }

    const fileRecord = await File.create({
      meetingId,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      fileUrl,
      uploadedAt: new Date(),
    });

    const populatedFile = await File.findById(fileRecord._id)
      .populate('uploadedBy', 'fullName email profileImage');

    res.status(201).json({
      success: true,
      file: populatedFile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error uploading file' });
  }
};

// @desc    Get files shared in a meeting
// @route   GET /api/files/:meetingId
// @access  Private
const getFilesByMeeting = async (req, res) => {
  try {
    // MongoDB Offline Fallback
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        files: [],
      });
    }
    const files = await File.find({ meetingId: req.params.meetingId })
      .populate('uploadedBy', 'fullName email profileImage')
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error loading files' });
  }
};

module.exports = {
  uploadFile,
  getFilesByMeeting,
};
