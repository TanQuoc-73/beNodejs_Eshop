const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/db');
const crypto = require('crypto');

// Middleware to get session ID from headers or generate one
router.use((req, res, next) => {
  // Get session ID from headers
  req.sessionID = req.headers['session-id'];
  if (!req.sessionID) {
    // Generate a new session ID if none exists
    req.sessionID = crypto.randomUUID();
  }
  next();
});

// Middleware to ensure session exists
router.use((req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  next();
});

// Helper function to get user ID from session or use session ID
const getUserId = (req) => {
  return req.user ? req.user.id : req.sessionID;
};

// Get cart items for current user/session
router.get('/', async (req, res) => {
  try {
    // Log thông tin request
    console.log('Fetching cart:', {
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers).length > 0 ? Object.keys(req.headers).slice(0, 3) : 'No headers',
      user: req.user ? 'authenticated' : 'guest',
      sessionID: req.headers['session-id'] || 'no-session'
    });

    // Get session ID from headers
    const sessionID = req.headers['session-id'];
    
    // If no session ID and no user, return empty cart
    if (!sessionID && !req.user) {
      console.log('Empty cart - no session and no user');
      return res.json([]);
    }

    // Sử dụng supabaseAdmin để có quyền truy cập
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        user_id,
        session_id,
        product_id,
        variant_id,
        quantity,
        created_at,
        updated_at,
        products (
          id,
          name,
          description,
          price,
          image_url,
          brand_id,
          created_at,
          updated_at
        ),
        product_variants (
          id,
          product_id,
          name,
          price,
          stock,
          image_url,
          created_at,
          updated_at
        )
      `)
      .eq('session_id', sessionID)
      .order('created_at', { ascending: false });

    // Kiểm tra kết quả
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Nếu không có items và người dùng đã đăng nhập, tìm items theo user_id
    if (!data || data.length === 0) {
      if (req.user && req.user.id) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('cart_items')
          .select(`
            id,
            user_id,
            session_id,
            product_id,
            variant_id,
            quantity,
            created_at,
            updated_at,
            products (
              id,
              name,
              description,
              price,
              image_url,
              brand_id,
              created_at,
              updated_at
            ),
            product_variants (
              id,
              product_id,
              name,
              price,
              stock,
              image_url,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', req.user.id)
          .order('created_at', { ascending: false });

        if (userError) {
          console.error('Error fetching user cart:', userError);
          throw userError;
        }

        if (userData && userData.length > 0) {
          data = userData;
        }
      }
    }
    
    console.log('Fetched cart items:', data.length);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /cart/items - Add item to cart
router.post('/items', async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Get product price
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('price, sale_price')
      .eq('id', product_id)
      .single();

    if (productError) throw productError;
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const price = product.sale_price || product.price;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.user ? null : req.sessionID;

    // Check if item already exists in cart
    const { data: existingItem, error: checkError } = await supabase
      .from('cart_items')
      .select('*')
      .eq(userId ? 'user_id' : 'session_id', userId || sessionId)
      .eq('product_id', product_id)
      .eq('variant_id', variant_id || null)
      .maybeSingle();

    if (checkError) throw checkError;

    let data, error;
    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + (parseInt(quantity) || 1);
      ({ data, error } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select());
    } else {
      // Add new item to cart
      ({ data, error } = await supabase
        .from('cart_items')
        .insert([{
          user_id: userId,
          session_id: sessionId,
          product_id,
          variant_id: variant_id || null,
          quantity: parseInt(quantity) || 1,
          price
        }])
        .select());
    }

    if (error) throw error;
    res.status(201).json(data ? data[0] : null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item quantity
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const userId = getUserId(req);
    
    const { data, error } = await supabase
      .from('cart_items')
      .update({ 
        quantity: parseInt(quantity),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .or(`user_id.eq.${userId},session_id.eq.${req.sessionID}`)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from cart
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)
      .or(`user_id.eq.${userId},session_id.eq.${req.sessionID}`);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear cart
router.delete('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .or(`user_id.eq.${userId},session_id.eq.${req.sessionID}`);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Merge guest cart with user cart after login
router.post('/merge', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get guest cart items
    const { data: guestItems, error: guestError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('session_id', sessionId);

    if (guestError) throw guestError;

    if (guestItems && guestItems.length > 0) {
      // Add guest items to user cart
      for (const item of guestItems) {
        const { data: existingItem, error: checkError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', req.user.id)
          .eq('product_id', item.product_id)
          .eq('variant_id', item.variant_id || null)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingItem) {
          // Update quantity if item exists
          const newQuantity = existingItem.quantity + item.quantity;
          await supabase
            .from('cart_items')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingItem.id);
        } else {
          // Add new item to user cart
          await supabase
            .from('cart_items')
            .insert([{
              user_id: req.user.id,
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              quantity: item.quantity,
              price: item.price
            }]);
        }
      }

      // Delete guest cart items
      await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
