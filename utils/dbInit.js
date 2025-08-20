// Enhanced error handling and database initialization
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const DEFAULT_TABLES = {
    users: {},
    hunts: {},
    clues: {},
    players: {},
    guilds: {},
    shop: {},
    events: {},
    achievements: {},
    stats: {}
};

async function initializeDatabase() {
    try {
        // Initialize all tables with default structures
        for (const [table, defaultValue] of Object.entries(DEFAULT_TABLES)) {
            const existingData = await db.get(table);
            if (!existingData) {
                await db.set(table, defaultValue);
                console.log(`✅ Initialized ${table} table`);
            }
        }

        // Validate database structure
        const tables = Object.keys(DEFAULT_TABLES);
        const promises = tables.map(table => db.get(table));
        const results = await Promise.all(promises);
        
        const missingTables = tables.filter((table, index) => !results[index]);
        if (missingTables.length > 0) {
            throw new Error(`Missing tables: ${missingTables.join(', ')}`);
        }

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        console.error('Stack trace:', error.stack);
        throw new Error(`Database initialization failed: ${error.message}`);
    }
}

module.exports = {
    initializeDatabase
};
