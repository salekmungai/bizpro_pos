// routes/settings.js
const express = require('express');
const router = express.Router();
const Business = require('../models/business');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { isAuthenticated } = require('../middleware/auth');

// Update Business Information
router.post('/update-business', async (req, res) => {
    try {
        const { businessName, businessAddress, businessTelephone, businessEmail } = req.body;

        // Validate input
        if (!businessName || !businessAddress || !businessTelephone || !businessEmail) {
            return res.status(400).json({ 
                success: false, 
                error: "All fields are required." 
            });
        }

        await Business.createOrUpdate({ businessName, businessAddress, businessTelephone, businessEmail });
        res.json({ 
            success: true, 
            message: "Business updated successfully",
            business: await Business.findOne() 
        });
    } catch (err) {
        console.error('Server Error:', err); // Log the error
        res.status(500).json({ 
            success: false, 
            error: "Failed to update business. Check server logs." 
        });
    }
});

router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false,
                error: "All fields are required" 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false,
                error: "New passwords do not match" 
            });
        }

        // Get current user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ 
                success: false,
                error: "Current password is incorrect" 
            });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(req.user.id, hashedPassword);

        res.json({ 
            success: true,
            message: "Password updated successfully" 
        });

    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
});
module.exports = router;