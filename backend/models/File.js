const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: [true, 'Please add a meeting ID reference'],
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: {
    type: String,
    required: [true, 'Please add the file name'],
  },
  fileUrl: {
    type: String,
    required: [true, 'Please add the file URL'],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('File', FileSchema);
