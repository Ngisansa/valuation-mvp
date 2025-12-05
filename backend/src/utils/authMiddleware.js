/**
 * Wrapper to re-export auth middleware from ./auth/authMiddleware.js
 * This ensures require('../utils/authMiddleware') works on case-sensitive filesystems (Render).
 */
module.exports = require('./auth/authMiddleware');
