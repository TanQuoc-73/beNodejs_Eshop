const express = require('express');
const cors = require('./middlewares/cors');
const brandsRouter = require('./routes/brands');
const cartRouter = require('./routes/cart');
const usersRouter = require('./routes/users');
const healthRouter = require('./routes/health');
const { sessionMiddleware } = require('./middlewares/session');

const app = express();

// Middleware
app.use(cors);
app.use(express.json());
app.use(sessionMiddleware);

// Routes
app.use('/api/brands', brandsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/auth', usersRouter);
app.use('/api', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
