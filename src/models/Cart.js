const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const Cart = {
    async getByUserId(userId) {
        const { data: cart, error } = await supabase
            .from('carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return cart;
    },

    async create(userId) {
        const { data: cart, error } = await supabase
            .from('carts')
            .insert([{ user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return cart;
    },

    async addItem(cartId, productId, variantId, quantity, unitPrice) {
        const { data: item, error } = await supabase
            .from('cart_items')
            .insert([{
                cart_id: cartId,
                product_id: productId,
                variant_id: variantId,
                quantity: quantity,
                unit_price: unitPrice,
                total_price: quantity * unitPrice
            }])
            .select()
            .single();

        if (error) throw error;
        return item;
    },

    async updateItem(cartId, itemId, quantity) {
        const { data: item, error } = await supabase
            .from('cart_items')
            .update({
                quantity: quantity,
                total_price: quantity * item.unit_price
            })
            .eq('id', itemId)
            .eq('cart_id', cartId)
            .select()
            .single();

        if (error) throw error;
        return item;
    },

    async removeItem(cartId, itemId) {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId)
            .eq('cart_id', cartId);

        if (error) throw error;
        return true;
    },

    async clearCart(cartId) {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId);

        if (error) throw error;
        return true;
    },

    async getCartItems(cartId) {
        const { data: items, error } = await supabase
            .from('cart_items')
            .select(`
                *,
                products:product_id (id, name, sku, image_url),
                variants:variant_id (id, name, price)
            `)
            .eq('cart_id', cartId);

        if (error) throw error;
        return items;
    },

    async calculateTotal(cartId) {
        const items = await this.getCartItems(cartId);
        return items.reduce((total, item) => total + item.total_price, 0);
    }
};

module.exports = Cart;
