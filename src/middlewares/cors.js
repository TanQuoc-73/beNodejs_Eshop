const cors = require('cors');

const corsOptions = {
    origin: process.env.CLIENT_URL || '*',  // Thay * bằng URL của frontend nếu muốn giới hạn
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

module.exports = cors(corsOptions);
