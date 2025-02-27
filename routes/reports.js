const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Get reports page - restrict to admin only
router.get('/', isAdmin, async (req, res) => {
    try {
        res.render('reports');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading reports page');
    }
});

// Get sales summary report - restrict to admin only
router.get('/summary', isAdmin, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        
        // Base query for filtering
        let baseQuery = `FROM sales s WHERE 1=1`;
        let params = [];

        // Date filtering logic
        if (period) {
            switch (period) {
                case 'today':
                    baseQuery += ` AND DATE(s.created_at) = CURDATE()`;
                    break;
                case 'this_month':
                    baseQuery += ` AND MONTH(s.created_at) = MONTH(CURDATE())`;
                    break;
                case 'last_month':
                    baseQuery += ` AND MONTH(s.created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
                    break;
            }
        } else if (startDate && endDate) {
            baseQuery += ` AND s.created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        // Get total sales and revenue
        const totalsQuery = `
            SELECT 
                COUNT(DISTINCT s.sale_id) as total_sales,
                SUM(s.total_amount) as total_revenue
            ${baseQuery}
        `;

        // Get payment method breakdown
        const paymentMethodsQuery = `
            SELECT 
                s.payment_method,
                COUNT(DISTINCT s.sale_id) as payment_method_count,
                SUM(s.total_amount) as payment_revenue  
            ${baseQuery}
            GROUP BY s.payment_method
`;
        // Execute both queries
        const [[totalResults]] = await db.query(totalsQuery, params);
        const [paymentResults] = await db.query(paymentMethodsQuery, params);

        // Build summary
        const summary = {
            totalSales: totalResults.total_sales || 0,
            totalRevenue: totalResults.total_revenue || 0,
            paymentMethods: paymentResults.reduce((acc, row) => {
                acc[row.payment_method] = {
                    count: row.payment_method_count,
                    revenue: row.payment_revenue
                };
                return acc;
            }, {})
        };

        res.json({ success: true, summary });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating sales summary',
            error: error.message 
        });
    }
});

// Transactions report - restrict to admin only
router.get('/transactions', isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select both start and end dates' 
            });
        }

        const query = `
            SELECT 
                s.sale_id as id,
                DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') as date,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'product', p.product_name,
                        'quantity', sd.quantity,
                        'price', sd.unit_price
                    )
                ) as items,
                s.payment_method,
                s.total_amount
            FROM sales s
            JOIN sale_details sd ON s.sale_id = sd.sale_id
            JOIN products p ON sd.product_id = p.product_id
            WHERE s.created_at BETWEEN ? AND ?
            GROUP BY s.sale_id
            ORDER BY s.created_at DESC
        `;

        const [results] = await db.query(query, [startDate, endDate]);
        
        res.json({ 
            success: true, 
            transactions: results.map(transaction => ({
                ...transaction,
                total_amount: parseFloat(transaction.total_amount),
                items: transaction.items // No JSON.parse() needed
            }))
        });

    } catch (error) {
        console.error('Transaction Report Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating transaction report',
            error: error.message 
        });
    }
});

// Products report - restrict to admin only
router.get('/products', isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const query = `
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.unit_price,
                p.quantity_in_stock,
                COALESCE(SUM(sd.quantity), 0) as total_sold,
                COALESCE(SUM(sd.quantity * sd.unit_price), 0) as total_revenue
            FROM products p
            LEFT JOIN sale_details sd ON p.product_id = sd.product_id
            LEFT JOIN sales s ON sd.sale_id = s.sale_id
            ${startDate && endDate ? 'WHERE s.created_at BETWEEN ? AND ?' : ''}
            GROUP BY p.product_id
            ORDER BY total_sold DESC
        `;

        const params = [];
        if (startDate && endDate) {
            params.push(startDate, endDate);
        }

        const [results] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            products: results.map(product => ({
                ...product,
                total_revenue: parseFloat(product.total_revenue),
                unit_price: parseFloat(product.unit_price)
            }))
        });

    } catch (error) {
        console.error('Products Report Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating products report',
            error: error.message 
        });
    }
});

module.exports = router;