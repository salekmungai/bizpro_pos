const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async findByUsername(username) {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        return rows[0];
    }

    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            [userData.username, hashedPassword, userData.name, userData.role]
        );
        return result.insertId;
    }

    static async validatePassword(user, password) {
        return await bcrypt.compare(password, user.password);
    }
}

module.exports = User;