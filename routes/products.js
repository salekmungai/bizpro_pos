// routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Main page render
router.get('/', async (req, res) => {
    try {
        const page = 1;
        const limit = 10;
        const [products] = await db.query(
            'SELECT * FROM products ORDER BY product_id DESC LIMIT ?',
            [limit]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');
        const totalPages = Math.ceil(total / limit);

        res.render('products', {
            products,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            search: '',
            category: ''
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching products');
    }
});

// API endpoint for real-time search and filter
router.get('/api/search', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';

        let whereClause = '1 = 1';
        let params = [];

        if (search) {
            whereClause += ' AND (product_name LIKE ? OR supplier LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category && category !== 'all') {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        // Get filtered products
        const [products] = await db.query(
            `SELECT * FROM products WHERE ${whereClause} ORDER BY product_id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get total count for pagination
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM products WHERE ${whereClause}`,
            params
        );

        const totalPages = Math.ceil(total / limit);

        res.json({
            products,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});


// Rest of the existing routes remain the same...
router.post('/', async (req, res) => {
    try {
        const { product_name, category, unit_price, quantity_in_stock, supplier } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO products (product_name, category, unit_price, quantity_in_stock, supplier) VALUES (?, ?, ?, ?, ?)',
            [product_name, category, unit_price, quantity_in_stock, supplier]
        );
        
        res.redirect('/products');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error adding product');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { product_name, category, unit_price, quantity_in_stock, supplier } = req.body;
        
        const [result] = await db.query(
            'UPDATE products SET product_name = ?, category = ?, unit_price = ?, quantity_in_stock = ?, supplier = ? WHERE product_id = ?',
            [product_name, category, unit_price, quantity_in_stock, supplier, req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false });
    }
});

module.exports = router;