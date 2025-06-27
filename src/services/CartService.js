const Cart = require('../models/Cart');

class CartService {
    async getCart(userId) {
        try {
            const cart = await Cart.getByUserId(userId);
            if (!cart) {
                return await Cart.create(userId);
            }
            return cart;
        } catch (error) {
            throw error;
        }
    }

    async addItem(userId, productId, variantId, quantity, unitPrice) {
        try {
            const cart = await this.getCart(userId);
            return await Cart.addItem(cart.id, productId, variantId, quantity, unitPrice);
        } catch (error) {
            throw error;
        }
    }

    async updateItem(userId, itemId, quantity) {
        try {
            const cart = await this.getCart(userId);
            return await Cart.updateItem(cart.id, itemId, quantity);
        } catch (error) {
            throw error;
        }
    }

    async removeItem(userId, itemId) {
        try {
            const cart = await this.getCart(userId);
            return await Cart.removeItem(cart.id, itemId);
        } catch (error) {
            throw error;
        }
    }

    async clearCart(userId) {
        try {
            const cart = await this.getCart(userId);
            return await Cart.clearCart(cart.id);
        } catch (error) {
            throw error;
        }
    }

    async getCartItems(userId) {
        try {
            const cart = await this.getCart(userId);
            const items = await Cart.getCartItems(cart.id);
            const total = await Cart.calculateTotal(cart.id);
            return {
                items,
                total
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CartService();
