const { QuickDB } = require('quick.db');
const db = new QuickDB();

async function initializeDatabase() {
    try {
        // Initialize users table
        const users = await db.get('users');
        if (!users) {
            await db.set('users', {});
        }

        // Initialize hunts table
        const hunts = await db.get('hunts');
        if (!hunts) {
            await db.set('hunts', {});
        }

        // Initialize clues table
        const clues = await db.get('clues');
        if (!clues) {
            await db.set('clues', {});
        }

        console.log('✅ Database initialized with hunts and clues');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = {
    initializeDatabase
};
