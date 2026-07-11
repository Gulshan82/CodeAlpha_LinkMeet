const express = require('express');
const { saveMessage, getMessagesByMeeting } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, saveMessage);
router.route('/:meetingId').get(protect, getMessagesByMeeting);

module.exports = router;
