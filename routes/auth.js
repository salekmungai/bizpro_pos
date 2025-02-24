const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true,
        successFlash: 'Welcome!'
    })(req, res, next);
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, role } = req.body;
        
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            req.flash('error_msg', 'Username already taken');
            return res.redirect('/register');
        }

        await User.create({ username, password, name, role });
        req.flash('success_msg', 'Registration successful. Please login.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error registering user');
        res.redirect('/register');
    }
});

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/login');
    });
});



module.exports = router;