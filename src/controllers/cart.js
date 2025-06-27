const cartService = require('../services/CartService');
const authMiddleware = require('../middleware/auth');

exports.getCart = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cart = await cartService.getCart(userId);
        res.json(cart);
    } catch (error) {
        next(error);
    }
};

exports.addItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { productId, variantId, quantity, unitPrice } = req.body;
        const item = await cartService.addItem(userId, productId, variantId, quantity, unitPrice);
        res.json(item);
    } catch (error) {
        next(error);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId, quantity } = req.body;
        const item = await cartService.updateItem(userId, itemId, quantity);
        res.json(item);
    } catch (error) {
        next(error);
    }
};

exports.removeItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.body;
        await cartService.removeItem(userId, itemId);
        res.json({ message: 'Item removed successfully' });
    } catch (error) {
        next(error);
    }
};

exports.clearCart = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await cartService.clearCart(userId);
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getCartItems = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { items, total } = await cartService.getCartItems(userId);
        res.json({ items, total });
    } catch (error) {
        next(error);
    }
};
