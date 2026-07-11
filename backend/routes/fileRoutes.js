const express = require('express');
const { uploadFile, getFilesByMeeting } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/:meetingId', protect, getFilesByMeeting);

module.exports = router;
