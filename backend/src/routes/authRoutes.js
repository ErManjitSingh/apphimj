const express = require('express');
const router = express.Router();
const { login, logout, getMe, register, heartbeat, beacon } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, login);
router.post('/register', protect, register);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/session/heartbeat', protect, heartbeat);
router.post('/session/beacon', authLimiter, beacon);

module.exports = router;
