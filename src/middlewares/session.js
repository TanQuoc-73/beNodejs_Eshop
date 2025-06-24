const session = require('express-session');
const FileStore = require('session-file-store')(session);

const sessionMiddleware = session({
  store: new FileStore(),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
});

// Middleware để kiểm tra và cập nhật session
const ensureSession = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  next();
};

module.exports = {
  sessionMiddleware,
  ensureSession
};
