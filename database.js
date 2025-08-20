const { QuickDB } = require('quick.db');

class DatabaseManager {
    constructor(options = {}) {
        this.db = new QuickDB(options);
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || 60000; // 1 minute default cache
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        // Initialize cleanup interval for cache
        this.cleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, this.cacheTimeout);
    }

    // Utility methods
    async retryOperation(operation, retries = this.maxRetries) {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retryOperation(operation, retries - 1);
            }
            throw error;
        }
    }

    getCacheKey(table, key) {
        return `${table}:${key}`;
    }

    setCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(cacheKey);
        return null;
    }

    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    validateUserId(userId) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID provided');
        }
        return true;
    }

    validateData(data, requiredFields = []) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data provided');
        }
        
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        return true;
    }

    // User data functions
    async getUser(userId) {
        try {
            this.validateUserId(userId);
            
            const cacheKey = this.getCacheKey('users', userId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const users = await this.db.get('users') || {};
                return users[userId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }
            
            return result;
        } catch (error) {
            console.error(`Error getting user ${userId}:`, error);
            throw new Error(`Failed to get user data: ${error.message}`);
        }
    }

    async setUser(userId, userData) {
        try {
            this.validateUserId(userId);
            this.validateData(userData);

            const result = await this.retryOperation(async () => {
                const users = await this.db.get('users') || {};
                users[userId] = {
                    ...userData,
                    lastUpdated: Date.now()
                };
                await this.db.set('users', users);
                return users[userId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('users', userId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting user ${userId}:`, error);
            throw new Error(`Failed to set user data: ${error.message}`);
        }
    }

    async deleteUser(userId) {
        try {
            this.validateUserId(userId);

            await this.retryOperation(async () => {
                const users = await this.db.get('users') || {};
                delete users[userId];
                await this.db.set('users', users);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('users', userId);
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    // Player data functions with default values
    getDefaultPlayerData() {
        return {
            coins: 0,
            dailyStreak: 0,
            huntsCompleted: 0,
            lastDaily: 0,
            lastHunt: 0,
            lastWork: 0,
            totalRewards: 0,
            failedHunts: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            expertSolved: 0,
            huntStreak: 0,
            perfectStreak: 0,
            achievements: [],
            inventory: [],
            equippedItems: {},
            totalDailyClaims: 0,
            averageSolveTime: 0,
            totalHints: 0,
            bonusEarned: 0,
            joinDate: Date.now(),
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
            reputation: 0,
            questsCompleted: 0,
            dungeonsCleared: 0,
            monstersDefeated: 0,
            bossesDefeated: 0,
            guildId: null,
            guildRank: null,
            pets: [],
            activePet: null,
            skills: {
                mining: 1,
                fishing: 1,
                crafting: 1,
                combat: 1,
                magic: 1
            },
            skillExperience: {
                mining: 0,
                fishing: 0,
                crafting: 0,
                combat: 0,
                magic: 0
            },
            titles: [],
            activeTitle: null,
            settings: {
                notifications: true,
                publicProfile: true,
                autoSell: false
            },
            statistics: {
                commandsUsed: 0,
                timeSpent: 0,
                favoriteCommand: null
            },
            lastUpdated: Date.now()
        };
    }

    async getPlayer(userId) {
        try {
            this.validateUserId(userId);

            const cacheKey = this.getCacheKey('players', userId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                
                if (!players[userId]) {
                    // Create default player data
                    players[userId] = this.getDefaultPlayerData();
                    await this.db.set('players', players);
                }
                
                return players[userId];
            });

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error getting player ${userId}:`, error);
            throw new Error(`Failed to get player data: ${error.message}`);
        }
    }

    async updatePlayer(userId, updateData) {
        try {
            this.validateUserId(userId);
            this.validateData(updateData);

            const result = await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                
                if (!players[userId]) {
                    players[userId] = this.getDefaultPlayerData();
                }
                
                // Deep merge update data with existing player data
                players[userId] = this.deepMerge(players[userId], {
                    ...updateData,
                    lastUpdated: Date.now()
                });
                
                await this.db.set('players', players);
                return players[userId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('players', userId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error updating player ${userId}:`, error);
            throw new Error(`Failed to update player data: ${error.message}`);
        }
    }

    async deletePlayer(userId) {
        try {
            this.validateUserId(userId);

            await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                delete players[userId];
                await this.db.set('players', players);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('players', userId);
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting player ${userId}:`, error);
            throw new Error(`Failed to delete player: ${error.message}`);
        }
    }

    // Deep merge utility
    deepMerge(target, source) {
        const output = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    output[key] = { ...source[key] };
                }
            } else {
                output[key] = source[key];
            }
        }
        
        return output;
    }

    // Hunt data functions
    async getHunt(userId) {
        try {
            this.validateUserId(userId);

            const cacheKey = this.getCacheKey('hunts', userId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const hunts = await this.db.get('hunts') || {};
                return hunts[userId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error(`Error getting hunt for ${userId}:`, error);
            throw new Error(`Failed to get hunt data: ${error.message}`);
        }
    }

    async setHunt(userId, huntData) {
        try {
            this.validateUserId(userId);
            this.validateData(huntData, ['difficulty', 'targetLocation']);

            const result = await this.retryOperation(async () => {
                const hunts = await this.db.get('hunts') || {};
                hunts[userId] = {
                    ...huntData,
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                };
                await this.db.set('hunts', hunts);
                return hunts[userId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('hunts', userId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting hunt for ${userId}:`, error);
            throw new Error(`Failed to set hunt data: ${error.message}`);
        }
    }

    async deleteHunt(userId) {
        try {
            this.validateUserId(userId);

            await this.retryOperation(async () => {
                const hunts = await this.db.get('hunts') || {};
                delete hunts[userId];
                await this.db.set('hunts', hunts);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('hunts', userId);
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting hunt for ${userId}:`, error);
            throw new Error(`Failed to delete hunt: ${error.message}`);
        }
    }

    // Clue data functions
    async getClues(userId) {
        try {
            this.validateUserId(userId);

            const cacheKey = this.getCacheKey('clues', userId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const clues = await this.db.get('clues') || {};
                return clues[userId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error(`Error getting clues for ${userId}:`, error);
            throw new Error(`Failed to get clues data: ${error.message}`);
        }
    }

    async setClues(userId, cluesData) {
        try {
            this.validateUserId(userId);
            this.validateData(cluesData);

            const result = await this.retryOperation(async () => {
                const clues = await this.db.get('clues') || {};
                clues[userId] = {
                    ...cluesData,
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                };
                await this.db.set('clues', clues);
                return clues[userId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('clues', userId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting clues for ${userId}:`, error);
            throw new Error(`Failed to set clues data: ${error.message}`);
        }
    }

    async deleteClues(userId) {
        try {
            this.validateUserId(userId);

            await this.retryOperation(async () => {
                const clues = await this.db.get('clues') || {};
                delete clues[userId];
                await this.db.set('clues', clues);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('clues', userId);
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting clues for ${userId}:`, error);
            throw new Error(`Failed to delete clues: ${error.message}`);
        }
    }

    // Guild data functions
    async getGuild(guildId) {
        try {
            if (!guildId || typeof guildId !== 'string') {
                throw new Error('Invalid guild ID provided');
            }

            const cacheKey = this.getCacheKey('guilds', guildId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const guilds = await this.db.get('guilds') || {};
                return guilds[guildId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error(`Error getting guild ${guildId}:`, error);
            throw new Error(`Failed to get guild data: ${error.message}`);
        }
    }

    async setGuild(guildId, guildData) {
        try {
            if (!guildId || typeof guildId !== 'string') {
                throw new Error('Invalid guild ID provided');
            }
            this.validateData(guildData, ['name', 'ownerId']);

            const result = await this.retryOperation(async () => {
                const guilds = await this.db.get('guilds') || {};
                guilds[guildId] = {
                    ...guildData,
                    createdAt: guildData.createdAt || Date.now(),
                    lastUpdated: Date.now()
                };
                await this.db.set('guilds', guilds);
                return guilds[guildId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('guilds', guildId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting guild ${guildId}:`, error);
            throw new Error(`Failed to set guild data: ${error.message}`);
        }
    }

    async deleteGuild(guildId) {
        try {
            if (!guildId || typeof guildId !== 'string') {
                throw new Error('Invalid guild ID provided');
            }

            await this.retryOperation(async () => {
                const guilds = await this.db.get('guilds') || {};
                delete guilds[guildId];
                await this.db.set('guilds', guilds);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('guilds', guildId);
            this.cache.delete(cacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting guild ${guildId}:`, error);
            throw new Error(`Failed to delete guild: ${error.message}`);
        }
    }

    // Leaderboard functions with pagination
    async getLeaderboard(type = 'coins', page = 1, limit = 10) {
        try {
            const validTypes = ['coins', 'hunts', 'level', 'experience', 'reputation'];
            if (!validTypes.includes(type)) {
                throw new Error(`Invalid leaderboard type: ${type}`);
            }

            const cacheKey = this.getCacheKey('leaderboard', `${type}_${page}_${limit}`);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                const playerArray = Object.entries(players)
                    .map(([userId, data]) => ({
                        userId,
                        ...data
                    }))
                    .filter(player => player[type] !== undefined && player[type] !== null);

                // Sort based on type
                const sortedPlayers = playerArray.sort((a, b) => {
                    const aValue = a[type] || 0;
                    const bValue = b[type] || 0;
                    return bValue - aValue;
                });

                // Paginate results
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedResults = sortedPlayers.slice(startIndex, endIndex);

                return {
                    players: paginatedResults,
                    totalPlayers: sortedPlayers.length,
                    currentPage: page,
                    totalPages: Math.ceil(sortedPlayers.length / limit),
                    hasNextPage: endIndex < sortedPlayers.length,
                    hasPrevPage: page > 1
                };
            });

            // Cache for shorter time since leaderboards change frequently
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error getting leaderboard:`, error);
            throw new Error(`Failed to get leaderboard: ${error.message}`);
        }
    }

    // Shop data functions
    async getShopItem(itemId) {
        try {
            if (!itemId || typeof itemId !== 'string') {
                throw new Error('Invalid item ID provided');
            }

            const cacheKey = this.getCacheKey('shop_item', itemId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const shop = await this.db.get('shop') || {};
                return shop[itemId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error(`Error getting shop item ${itemId}:`, error);
            throw new Error(`Failed to get shop item: ${error.message}`);
        }
    }

    async setShopItem(itemId, itemData) {
        try {
            if (!itemId || typeof itemId !== 'string') {
                throw new Error('Invalid item ID provided');
            }
            this.validateData(itemData, ['name', 'price']);

            const result = await this.retryOperation(async () => {
                const shop = await this.db.get('shop') || {};
                shop[itemId] = {
                    ...itemData,
                    id: itemId,
                    createdAt: itemData.createdAt || Date.now(),
                    lastUpdated: Date.now()
                };
                await this.db.set('shop', shop);
                return shop[itemId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('shop_item', itemId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting shop item ${itemId}:`, error);
            throw new Error(`Failed to set shop item: ${error.message}`);
        }
    }

    async getAllShopItems() {
        try {
            const cacheKey = this.getCacheKey('shop', 'all');
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                return await this.db.get('shop') || {};
            });

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting all shop items:', error);
            throw new Error(`Failed to get shop items: ${error.message}`);
        }
    }

    async deleteShopItem(itemId) {
        try {
            if (!itemId || typeof itemId !== 'string') {
                throw new Error('Invalid item ID provided');
            }

            await this.retryOperation(async () => {
                const shop = await this.db.get('shop') || {};
                delete shop[itemId];
                await this.db.set('shop', shop);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('shop_item', itemId);
            this.cache.delete(cacheKey);
            
            // Also clear the all items cache
            const allCacheKey = this.getCacheKey('shop', 'all');
            this.cache.delete(allCacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting shop item ${itemId}:`, error);
            throw new Error(`Failed to delete shop item: ${error.message}`);
        }
    }

    // Event data functions
    async getEvent(eventId) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                throw new Error('Invalid event ID provided');
            }

            const cacheKey = this.getCacheKey('event', eventId);
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const events = await this.db.get('events') || {};
                return events[eventId] || null;
            });

            if (result) {
                this.setCache(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error(`Error getting event ${eventId}:`, error);
            throw new Error(`Failed to get event: ${error.message}`);
        }
    }

    async setEvent(eventId, eventData) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                throw new Error('Invalid event ID provided');
            }
            this.validateData(eventData, ['name', 'startDate', 'endDate']);

            const result = await this.retryOperation(async () => {
                const events = await this.db.get('events') || {};
                events[eventId] = {
                    ...eventData,
                    id: eventId,
                    createdAt: eventData.createdAt || Date.now(),
                    lastUpdated: Date.now()
                };
                await this.db.set('events', events);
                return events[eventId];
            });

            // Update cache
            const cacheKey = this.getCacheKey('event', eventId);
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error(`Error setting event ${eventId}:`, error);
            throw new Error(`Failed to set event: ${error.message}`);
        }
    }

    async getAllEvents() {
        try {
            const cacheKey = this.getCacheKey('events', 'all');
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                return await this.db.get('events') || {};
            });

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting all events:', error);
            throw new Error(`Failed to get events: ${error.message}`);
        }
    }

    async deleteEvent(eventId) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                throw new Error('Invalid event ID provided');
            }

            await this.retryOperation(async () => {
                const events = await this.db.get('events') || {};
                delete events[eventId];
                await this.db.set('events', events);
            });

            // Clear from cache
            const cacheKey = this.getCacheKey('event', eventId);
            this.cache.delete(cacheKey);
            
            // Also clear the all events cache
            const allCacheKey = this.getCacheKey('events', 'all');
            this.cache.delete(allCacheKey);

            return true;
        } catch (error) {
            console.error(`Error deleting event ${eventId}:`, error);
            throw new Error(`Failed to delete event: ${error.message}`);
        }
    }

    // Statistics functions
    async getGlobalStats() {
        try {
            const cacheKey = this.getCacheKey('stats', 'global');
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const result = await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                const playerEntries = Object.values(players);
                const playerCount = playerEntries.length;

                if (playerCount === 0) {
                    return {
                        totalPlayers: 0,
                        totalCoins: 0,
                        totalHunts: 0,
                        totalExperience: 0,
                        averageCoins: 0,
                        averageHunts: 0,
                        averageLevel: 0,
                        topLevel: 0,
                        totalAchievements: 0
                    };
                }

                const stats = playerEntries.reduce((acc, player) => {
                    acc.totalCoins += player.coins || 0;
                    acc.totalHunts += player.huntsCompleted || 0;
                    acc.totalExperience += player.experience || 0;
                    acc.totalAchievements += (player.achievements || []).length;
                    acc.maxLevel = Math.max(acc.maxLevel, player.level || 1);
                    acc.totalLevels += player.level || 1;
                    return acc;
                }, {
                    totalCoins: 0,
                    totalHunts: 0,
                    totalExperience: 0,
                    totalAchievements: 0,
                    maxLevel: 0,
                    totalLevels: 0
                });

                return {
                    totalPlayers: playerCount,
                    totalCoins: stats.totalCoins,
                    totalHunts: stats.totalHunts,
                    totalExperience: stats.totalExperience,
                    totalAchievements: stats.totalAchievements,
                    averageCoins: Math.floor(stats.totalCoins / playerCount),
                    averageHunts: Math.floor(stats.totalHunts / playerCount),
                    averageLevel: Math.floor(stats.totalLevels / playerCount),
                    topLevel: stats.maxLevel,
                    lastUpdated: Date.now()
                };
            });

            // Cache global stats for a shorter time as they change frequently
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error getting global stats:', error);
            throw new Error(`Failed to get global stats: ${error.message}`);
        }
    }

    // Bulk operations
    async bulkUpdatePlayers(updates) {
        try {
            if (!Array.isArray(updates)) {
                throw new Error('Updates must be an array');
            }

            const results = await this.retryOperation(async () => {
                const players = await this.db.get('players') || {};
                const updateResults = [];

                for (const { userId, data } of updates) {
                    this.validateUserId(userId);
                    this.validateData(data);

                    if (!players[userId]) {
                        players[userId] = this.getDefaultPlayerData();
                    }

                    players[userId] = this.deepMerge(players[userId], {
                        ...data,
                        lastUpdated: Date.now()
                    });

                    updateResults.push({ userId, success: true });

                    // Update cache
                    const cacheKey = this.getCacheKey('players', userId);
                    this.setCache(cacheKey, players[userId]);
                }

                await this.db.set('players', players);
                return updateResults;
            });

            return results;
        } catch (error) {
            console.error('Error in bulk update:', error);
            throw new Error(`Failed to bulk update players: ${error.message}`);
        }
    }

    // Database maintenance
    async cleanup() {
        try {
            clearInterval(this.cleanupInterval);
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('Error cleaning up database:', error);
            return false;
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.retryOperation(async () => {
                await this.db.get('healthcheck');
            });
            return {
                status: 'healthy',
                cacheSize: this.cache.size,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

// Export both the class and a default instance
const db = new DatabaseManager();

module.exports = {
    DatabaseManager,
    db,
    // Legacy function exports for backward compatibility
    getUser: (userId) => db.getUser(userId),
    setUser: (userId, userData) => db.setUser(userId, userData),
    deleteUser: (userId) => db.deleteUser(userId),
    getPlayer: (userId) => db.getPlayer(userId),
    updatePlayer: (userId, updateData) => db.updatePlayer(userId, updateData),
    deletePlayer: (userId) => db.deletePlayer(userId),
    getHunt: (userId) => db.getHunt(userId),
    setHunt: (userId, huntData) => db.setHunt(userId, huntData),
    deleteHunt: (userId) => db.deleteHunt(userId),
    getClues: (userId) => db.getClues(userId),
    setClues: (userId, cluesData) => db.setClues(userId, cluesData),
    deleteClues: (userId) => db.deleteClues(userId),
    getGuild: (guildId) => db.getGuild(guildId),
    setGuild: (guildId, guildData) => db.setGuild(guildId, guildData),
    deleteGuild: (guildId) => db.deleteGuild(guildId),
    getLeaderboard: (type, page, limit) => db.getLeaderboard(type, page, limit),
    getShopItem: (itemId) => db.getShopItem(itemId),
    setShopItem: (itemId, itemData) => db.setShopItem(itemId, itemData),
    getAllShopItems: () => db.getAllShopItems(),
    deleteShopItem: (itemId) => db.deleteShopItem(itemId),
    getEvent: (eventId) => db.getEvent(eventId),
    setEvent: (eventId, eventData) => db.setEvent(eventId, eventData),
    getAllEvents: () => db.getAllEvents(),
    deleteEvent: (eventId) => db.deleteEvent(eventId),
    getGlobalStats: () => db.getGlobalStats(),
    bulkUpdatePlayers: (updates) => db.bulkUpdatePlayers(updates),
    cleanup: () => db.cleanup(),
    healthCheck: () => db.healthCheck()
};