const express = require('express');
const router = express.Router();
const supabase = require('../config/db');

// GET /brands - Lấy danh sách thương hiệu
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('name');

        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /brands/:id - Lấy chi tiết thương hiệu
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
