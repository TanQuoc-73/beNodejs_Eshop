const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/db');

// GET /brands - Lấy danh sách thương hiệu
router.get('/', async (req, res) => {
    try {
        // Log thông tin request
        console.log('Fetching brands:', { 
            method: req.method, 
            url: req.url,
            headers: Object.keys(req.headers).length > 0 ? Object.keys(req.headers).slice(0, 3) : 'No headers' 
        });

        // Sử dụng supabaseAdmin để có quyền truy cập
        const { data, error } = await supabaseAdmin
            .from('brands')
            .select(`
              id,
              name,
              description,
              logo_url,
              created_at,
              updated_at
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('Fetched brands:', data.length);
        res.json(data);
    } catch (error) {
        console.error('Error fetching brands:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: error.message || 'Đã xảy ra lỗi khi lấy danh sách thương hiệu',
            details: error.details || null
        });
    }
});

// GET /brands/:id - Lấy chi tiết thương hiệu
router.get('/:id', async (req, res) => {
    try {
        // Log thông tin request
        console.log('Fetching brand detail:', { 
            id: req.params.id,
            method: req.method, 
            url: req.url,
            headers: Object.keys(req.headers).length > 0 ? Object.keys(req.headers).slice(0, 3) : 'No headers' 
        });

        // Sử dụng supabaseAdmin để có quyền truy cập
        const { data, error } = await supabaseAdmin
            .from('brands')
            .select(`
              id,
              name,
              description,
              logo_url,
              created_at,
              updated_at
            `)
            .eq('id', req.params.id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.log('Brand not found:', req.params.id);
            return res.status(404).json({ 
                error: 'Thương hiệu không tồn tại',
                id: req.params.id
            });
        }
        
        console.log('Fetched brand detail:', data.id);
        res.json(data);
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
