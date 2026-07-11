const express = require('express');
const { createMeeting, getMeetings, getMeetingById, deleteMeeting } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/create').post(protect, createMeeting);
router.route('/').get(protect, getMeetings);
router.route('/:id').get(protect, getMeetingById).delete(protect, deleteMeeting);

module.exports = router;
