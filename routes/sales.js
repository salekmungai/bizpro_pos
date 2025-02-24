// routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
// Add this before the existing GET route

// Get sales form page
router.get('/', async (req, res) => {
    try {
        // Fetch products for dropdown
        const [products] = await db.query('SELECT product_id, product_name, unit_price, quantity_in_stock FROM products WHERE quantity_in_stock > 0');
        res.render('sales/new', { products });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading sales form');
    }
});
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm || searchTerm.length < 2) {
            return res.json([]);
        }

        const [products] = await db.query(
            `SELECT 
                product_id, 
                product_name, 
                unit_price, 
                quantity_in_stock 
            FROM products 
            WHERE quantity_in_stock > 0 
            AND (
                product_id LIKE ? OR 
                product_name LIKE ? OR
                SOUNDEX(product_name) = SOUNDEX(?)
            )
            LIMIT 10`,
            [`%${searchTerm}%`, `%${searchTerm}%`, searchTerm]
        );
        
        res.json({
            success: true,
            products: products.map(p => ({
                ...p,
                unit_price: parseFloat(p.unit_price)
            }))
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching products',
            error: error.message 
        });
    }
});

// Process new sale
router.post('/', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        console.log("Received Sale Request:", req.body); // Log request data
        await connection.beginTransaction();
        
        const { products, quantities, payment_method, total_amount } = req.body;

        if (!products || !quantities || !payment_method || !total_amount) {
            throw new Error("Missing required fields");
        }

        console.log("Products:", products, "Quantities:", quantities, "Payment Method:", payment_method, "Total:", total_amount);

        // Insert sale record
        const [saleResult] = await connection.query(
            'INSERT INTO sales (total_amount, payment_method, created_at) VALUES (?, ?, NOW())',
            [total_amount, payment_method]
        );

        const saleId = saleResult.insertId;
        console.log("Sale ID:", saleId);

        for (let i = 0; i < products.length; i++) {
            const productId = products[i];
            const quantity = quantities[i];

            console.log(`Processing Product ID: ${productId}, Quantity: ${quantity}`);

            // Fetch product details
            const [productRows] = await connection.query(
                'SELECT unit_price, quantity_in_stock FROM products WHERE product_id = ?',
                [productId]
            );

            if (productRows.length === 0) {
                throw new Error(`Product ${productId} not found`);
            }

            const product = productRows[0];
            console.log("Product Details:", product);

            if (product.quantity_in_stock < quantity) {
                throw new Error(`Insufficient stock for product ${productId}`);
            }

            // Insert into sale_details table
            await connection.query(
                'INSERT INTO sale_details (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                [saleId, productId, quantity, product.unit_price]
            );

            // Update stock
            await connection.query(
                'UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?',
                [quantity, productId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Sale recorded successfully', saleId });

    } catch (error) {
        await connection.rollback();
        console.error('Sale processing error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Error processing sale' });

    } finally {
        connection.release();
    }
});

// Get sale details by ID
router.get('/:id', async (req, res) => {
    try {
        const [saleDetails] = await db.query(`
            SELECT s.sale_id, s.total_amount, s.payment_method, s.created_at,
                   sd.product_id, sd.quantity, sd.unit_price,
                   p.product_name
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            WHERE s.sale_id = ?
        `, [req.params.id]);

        if (saleDetails.length === 0) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        res.json({ success: true, saleDetails });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sale details' });
    }
});

// Generate receipt data
router.get('/:id/receipt', async (req, res) => {
    try {
        const [saleDetails] = await db.query(`
            SELECT 
                s.sale_id, 
                s.total_amount, 
                s.payment_method, 
                s.created_at,
                sd.product_id, 
                sd.quantity, 
                sd.unit_price,
                p.product_name
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            WHERE s.sale_id = ?
        `, [req.params.id]);

        if (saleDetails.length === 0) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        const receipt = {
            saleId: saleDetails[0].sale_id,
            totalAmount: saleDetails[0].total_amount,
            paymentMethod: saleDetails[0].payment_method,
            createdAt: saleDetails[0].created_at,
            items: saleDetails.map(item => ({
                productName: item.product_name,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                subtotal: item.quantity * item.unit_price
            }))
        };

        res.json({ success: true, receipt });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error generating receipt' });
    }
});

module.exports = router;