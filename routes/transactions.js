// routes/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
// Get filtered transactions
router.get('/filter', async (req, res) => {
    try {
        const { paymentMethod, period, startDate, endDate, specificDate } = req.query;

        let query = `
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
            WHERE 1=1
        `;

        if (paymentMethod) {
            query += ` AND s.payment_method = '${paymentMethod}'`;
        }

        if (period === 'today') {
            query += ` AND DATE(s.created_at) = CURDATE()`;
        } else if (period === 'yesterday') {
            query += ` AND DATE(s.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
        } else if (period === 'custom' && startDate && endDate) {
            query += ` AND DATE(s.created_at) BETWEEN '${startDate}' AND '${endDate}'`;
        } else if (period === 'specific' && specificDate) {
            query += ` AND DATE(s.created_at) = '${specificDate}'`;
        }

        query += ` GROUP BY s.sale_id ORDER BY s.created_at DESC`;

        const [transactions] = await db.query(query);

        res.json({ transactions });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching filtered transactions');
    }
});
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


// Get all transactions with pagination
// routes/transactions.js
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if no page is specified
        const limit = 20; // Number of transactions per page
        const offset = (page - 1) * limit; // Calculate offset

        // Fetch total number of transactions for pagination
        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) as total FROM sales
        `);

        // Fetch paginated transactions
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
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.render('transactions/index', {
            transactions,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total, // Pass the total number of transactions to the template
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
// Get transaction details
router.get('/:id', async (req, res) => {
    try {
        const saleId = req.params.id;

        // Fetch transaction details
        const [saleDetails] = await db.query(`
            SELECT 
                s.sale_id,
                s.total_amount,
                s.payment_method,
                s.created_at,
                p.product_name,
                sd.quantity,
                sd.unit_price,
                (sd.quantity * sd.unit_price) as subtotal
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            WHERE s.sale_id = ?
        `, [saleId]);

        if (saleDetails.length === 0) {
            return res.status(404).send('Transaction not found');
        }

        res.render('transactions/details', {
            saleDetails,
            formatDate: (date) => {
                return new Date(date).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching transaction details');
    }
});

module.exports = router;
