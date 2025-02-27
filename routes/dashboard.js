// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Business = require('../models/business'); // Import the Business class


router.get('/', async (req, res) => {
    try {
        // Fetch the business data from the database
        let business = await Business.findOne();

        // If no business data exists, initialize it with default values
        if (!business) {
            await Business.createOrUpdate({
                businessName: 'Your Business Name',
                businessAddress: '123 Business St',
                businessTelephone: '123-456-7890',
                businessEmail: 'info@yourbusiness.com'
            });

            // Fetch the newly created business data
            business = await Business.findOne();
        }

        // Render the dashboard view and pass the business data
        res.render('dashboard', { 
            user: req.user, 
            business: business 
        });
    } catch (err) {
        console.error('Error fetching business data:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;