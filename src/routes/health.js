const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Kiểm tra kết nối database
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database health check failed:', error);
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed',
      error: error.message 
    });
  }
});

module.exports = router;
