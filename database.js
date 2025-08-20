
// Enhanced Database Module with Better Error Handling and Performance
const fs = require('fs');
const path = require('path');

// Global error handler for database
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Create a simple JSON-based database
class SimpleDatabase {
    constructor() {
        this.dataPath = path.join(__dirname, 'data.json');
        this.data = this.loadData();
        this.saveTimeout = null;
        this.isLoading = false;
    }

    loadData() {
        try {
            this.isLoading = true;
            if (fs.existsSync(this.dataPath)) {
                const rawData = fs.readFileSync(this.dataPath, 'utf8');
                const parsed = JSON.parse(rawData);
                this.isLoading = false;
                return parsed;
            }
        } catch (error) {
            console.warn('Error loading database, creating new one:', error.message);
        }
        this.isLoading = false;
        return {
            users: {},
            guilds: {},
            settings: {},
            globalStats: {
                totalUsers: 0,
                totalCommands: 0,
                totalInteractions: 0
            }
        };
    }

    saveData() {
        if (this.isLoading) return;
        
        try {
            // Debounce saves to prevent excessive writes
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            this.saveTimeout = setTimeout(() => {
                fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
                this.saveTimeout = null;
            }, 1000);
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    async getPlayer(userId) {
        try {
            if (!this.data.users[userId]) {
                this.data.users[userId] = this.createDefaultPlayer(userId);
                this.data.globalStats.totalUsers++;
                this.saveData();
            }
            return { ...this.data.users[userId] }; // Return copy to prevent direct mutations
        } catch (error) {
            console.error('Error getting player:', error);
            return this.createDefaultPlayer(userId);
        }
    }

    async updatePlayer(userId, updateData) {
        try {
            if (!this.data.users[userId]) {
                this.data.users[userId] = this.createDefaultPlayer(userId);
                this.data.globalStats.totalUsers++;
            }

            // Deep merge instead of direct assignment
            this.data.users[userId] = this.deepMerge(this.data.users[userId], updateData);
            this.data.users[userId].lastSeen = Date.now();
            this.saveData();
            return true;
        } catch (error) {
            console.error('Error updating player:', error);
            return false;
        }
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    createDefaultPlayer(userId) {
        return {
            id: userId,
            coins: 100,
            level: 1,
            experience: 0,
            health: 100,
            maxHealth: 100,
            mana: 100,
            maxMana: 100,
            strength: 10,
            defense: 10,
            agility: 10,
            intelligence: 10,
            inventory: {
                items: [],
                equipment: {
                    weapon: null,
                    armor: null,
                    accessory: null
                }
            },
            skills: {
                mining: 1,
                fishing: 1,
                farming: 1,
                combat: 1,
                magic: 1,
                crafting: 1
            },
            skillExperience: {
                mining: 0,
                fishing: 0,
                farming: 0,
                combat: 0,
                magic: 0,
                crafting: 0
            },
            achievements: [],
            pets: [],
            house: {
                rooms: ['living_room'],
                decorations: [],
                level: 1
            },
            bank: {
                savings: 0,
                investments: []
            },
            buffs: [],
            dailyStreak: 0,
            lastDaily: null,
            totalDailyClaims: 0,
            statistics: {
                commandsUsed: 0,
                itemsCrafted: 0,
                monstersDefeated: 0,
                fishCaught: 0,
                oresMined: 0,
                biggestFish: 'None'
            },
            location: 'village',
            lastSeen: Date.now(),
            createdAt: Date.now()
        };
    }

    async getUser(userId) {
        return await this.getPlayer(userId);
    }

    async updateUser(userId, data) {
        return await this.updatePlayer(userId, data);
    }

    async getGuild(guildId) {
        try {
            if (!this.data.guilds[guildId]) {
                this.data.guilds[guildId] = {
                    id: guildId,
                    settings: {
                        prefix: '!',
                        welcomeChannel: null,
                        logChannel: null
                    },
                    members: {},
                    level: 1,
                    experience: 0,
                    treasury: 0,
                    createdAt: Date.now()
                };
                this.saveData();
            }
            return { ...this.data.guilds[guildId] };
        } catch (error) {
            console.error('Error getting guild:', error);
            return null;
        }
    }

    async updateGuild(guildId, updateData) {
        try {
            if (!this.data.guilds[guildId]) {
                await this.getGuild(guildId); // Create if doesn't exist
            }
            
            this.data.guilds[guildId] = this.deepMerge(this.data.guilds[guildId], updateData);
            this.saveData();
            return true;
        } catch (error) {
            console.error('Error updating guild:', error);
            return false;
        }
    }

    async getGlobalStats() {
        return { ...this.data.globalStats };
    }

    async updateGlobalStats(stats) {
        try {
            this.data.globalStats = { ...this.data.globalStats, ...stats };
            this.saveData();
            return true;
        } catch (error) {
            console.error('Error updating global stats:', error);
            return false;
        }
    }

    async getLeaderboard(type = 'level', limit = 10) {
        try {
            const users = Object.values(this.data.users);
            let sortKey = 'level';
            
            switch (type) {
                case 'coins':
                    sortKey = 'coins';
                    break;
                case 'experience':
                    sortKey = 'experience';
                    break;
                case 'level':
                default:
                    sortKey = 'level';
                    break;
            }
            
            return users
                .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
                .slice(0, limit)
                .map(user => ({
                    id: user.id,
                    [sortKey]: user[sortKey] || 0,
                    level: user.level || 1
                }));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Cleanup methods
    async cleanup() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveData();
        }
    }
}

// Initialize database
let db;
try {
    db = new SimpleDatabase();
    console.log('✅ JSON Database initialized successfully');
} catch (error) {
    console.error('Failed to initialize database:', error);
    // Create minimal fallback
    db = {
        async getPlayer(userId) {
            return {
                id: userId,
                coins: 100,
                level: 1,
                inventory: { items: [] },
                skills: {},
                statistics: {}
            };
        },
        async updatePlayer() { return true; },
        async getUser(userId) { return this.getPlayer(userId); },
        async updateUser() { return true; },
        async getGuild() { return {}; },
        async updateGuild() { return true; },
        async getGlobalStats() { return {}; },
        async updateGlobalStats() { return true; },
        async getLeaderboard() { return []; }
    };
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Gracefully shutting down database...');
    if (db && db.cleanup) {
        await db.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (db && db.cleanup) {
        await db.cleanup();
    }
});

module.exports = { db };
