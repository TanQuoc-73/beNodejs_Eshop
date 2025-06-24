const cors = require('cors');

// Cấu hình CORS đơn giản cho môi trường phát triển
const corsOptions = {
  origin: '*', // Cho phép tất cả các origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'session-id', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware CORS
const corsMiddleware = cors(corsOptions);

// Xử lý preflight request
const corsHandler = (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, session-id');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Xử lý preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Tiếp tục xử lý request
  next();
};

module.exports = corsHandler;
