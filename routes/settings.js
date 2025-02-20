// settings.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// Change Password Route
router.post('/settings/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Validate password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                error: 'New passwords do not match' 
            });
        }

        // Get user from session
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ 
                error: 'User not authenticated' 
            });
        }

        // Get user from database
        const [user] = await db.query(
            'SELECT * FROM users WHERE id = ?', 
            [userId]
        );

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            currentPassword, 
            user.password
        );

        if (!isValidPassword) {
            return res.status(400).json({ 
                error: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ 
                error: 'Error logging out' 
            });
        }
        res.redirect('/login');
    });
});

module.exports = router;