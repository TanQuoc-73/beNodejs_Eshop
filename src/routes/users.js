const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sessionMiddleware, ensureSession } = require('../middlewares/session');

// Middleware để kiểm tra token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Đăng ký tài khoản mới
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Kiểm tra xem email đã tồn tại chưa
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo tài khoản mới
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Tạo token
    const token = jwt.sign({ id: data.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: data.id,
        name: data.name,
        email: data.email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Tìm người dùng
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, password')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Tạo token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Cập nhật thời gian đăng nhập cuối cùng
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kiểm tra token
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, created_at, last_login')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Đăng xuất
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Xóa token khỏi session (nếu có)
    req.session.token = null;
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
