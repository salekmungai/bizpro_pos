const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/dashboard');
};

module.exports = { isAuthenticated, isAdmin };