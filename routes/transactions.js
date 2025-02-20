// routes/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get recent orders (last 10 transactions)
router.get('/recent', async (req, res) => {
    try {
        // Get last 10 sales with their details
        const [transactions] = await db.query(`
            SELECT 
                s.sale_id,
                s.total_amount,
                s.payment_method,
                s.created_at,
                GROUP_CONCAT(
                    CONCAT(p.product_name, ' (', sd.quantity, ' × Ksh.', sd.unit_price, ')')
                    SEPARATOR ', '
                ) as items
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            GROUP BY s.sale_id
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        res.render('transactions/recentOrders', { 
            transactions,
            formatDate: (date) => {
                return new Date(date).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching recent transactions');
    }
});

// Get all transactions (existing route)
router.get('/', async (req, res) => {
    try {
        // Your existing code for all transactions
        const [transactions] = await db.query(`
            SELECT 
                s.sale_id,
                s.total_amount,
                s.payment_method,
                s.created_at,
                GROUP_CONCAT(
                    CONCAT(p.product_name, ' (', sd.quantity, ' × Ksh.', sd.unit_price, ')')
                    SEPARATOR ', '
                ) as items
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            GROUP BY s.sale_id
            ORDER BY s.created_at DESC
        `);

        res.render('transactions/index', { 
            transactions,
            formatDate: (date) => {
                return new Date(date).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching transactions');
    }
});

// Get transaction details (existing route)
router.get('/:id', async (req, res) => {
    // Your existing code for transaction details
    // ...
});

module.exports = router;