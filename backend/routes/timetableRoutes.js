const express = require('express');
const router = express.Router();
const controller = require('../controllers/timetableController');

router.get('/timetable', controller.getSchedule);
router.post('/timetable', controller.createSchedule);
router.delete('/timetable/:id', controller.deleteSchedule);

module.exports = router;