const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware để kiểm tra quyền admin
const ensureAdmin = (req, res, next) => {
  next(); // Bỏ qua kiểm tra quyền admin vì chúng ta đã sử dụng service_role key
};

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

// Middleware để kiểm tra session
const ensureSession = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Đăng ký tài khoản mới
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // Kiểm tra email đã tồn tại
    const { data: existingUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(user => user.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Tạo tài khoản trong Supabase Auth
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return res.status(500).json({ 
        error: signUpError.message || 'Đã xảy ra lỗi khi tạo tài khoản' 
      });
    }

    const userId = authData.user.id;

    // Tạo profile trong user_profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        first_name: name.split(' ').slice(0, -1).join(' ') || name,
        last_name: name.split(' ').slice(-1)[0] || '',
        phone: phone || null
      })
      .select()
      .single();

    if (profileError) {
      // Xóa tài khoản auth đã tạo nếu tạo profile thất bại
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error('Profile creation error:', profileError);
      return res.status(500).json({ 
        error: profileError.message || 'Đã xảy ra lỗi khi tạo profile' 
      });
    }

    // Tạo token
    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: {
        id: userId,
        email: authData.user.email,
        name,
        phone
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: error.message || 'Đã xảy ra lỗi khi đăng ký' 
    });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Đăng nhập với Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
      }
      throw signInError;
    }

    const userId = authData.user.id;

    // Lấy thông tin profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        addresses:user_addresses(*)
      `)
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Tạo token
    const token = jwt.sign(
      { id: userId, email: authData.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Cập nhật thời gian đăng nhập cuối cùng
    await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    res.json({
      user: {
        id: userId,
        email: authData.user.email,
        ...profile
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: error.message || 'Đã xảy ra lỗi khi đăng nhập' 
    });
  }
});

// Lấy thông tin người dùng
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        addresses:user_addresses(*)
      `)
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json({
      id: req.user.id,
      email: req.user.email,
      ...profile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Đăng xuất
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Đăng xuất từ Supabase Auth
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) throw signOutError;

    // Xóa token khỏi session
    req.session.token = null;
    
    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: error.message || 'Đã xảy ra lỗi khi đăng xuất' 
    });
  }
});

module.exports = router;
