// models/business.js
const db = require('../config/database'); // Import the database connection

class Business {
    static async findOne() {
        const [rows] = await db.query('SELECT * FROM business LIMIT 1');
        return rows[0]; // Return the first row (business data) or undefined if no data exists
    }

    static async createOrUpdate(businessData) {
        try {
            const { businessName, businessAddress, businessTelephone, businessEmail } = businessData;
            const [existing] = await db.query('SELECT id FROM business LIMIT 1');
    
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO business (businessName, businessAddress, businessTelephone, businessEmail) VALUES (?, ?, ?, ?)',
                    [businessName, businessAddress, businessTelephone, businessEmail]
                );
            } else {
                await db.query(
                    'UPDATE business SET businessName = ?, businessAddress = ?, businessTelephone = ?, businessEmail = ? WHERE id = ?',
                    [businessName, businessAddress, businessTelephone, businessEmail, existing[0].id]
                );
            }
            return this.findOne(); // Return updated data
        } catch (err) {
            console.error('Database Error:', err); // Log detailed error
            throw err;
        }
    }
}

module.exports = Business;