
const { Collection } = require('discord.js');

class CooldownManager {
    constructor() {
        this.cooldowns = new Collection();
        this.globalCooldowns = new Collection();
        this.userCooldowns = new Collection();
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Clean every minute
    }

    /**
     * Check if a user is on cooldown for a specific command
     * @param {string} commandName - Name of the command
     * @param {string} userId - User ID
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {Object} - Cooldown information
     */
    checkCooldown(commandName, userId, cooldownTime = 3) {
        if (!commandName || !userId) {
            return { onCooldown: false, timeLeft: 0 };
        }

        const key = `${commandName}_${userId}`;
        const now = Date.now();
        const cooldownMillis = cooldownTime * 1000;

        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const timestamps = this.cooldowns.get(commandName);
        
        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownMillis;
            
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { 
                    onCooldown: true, 
                    timeLeft,
                    expiresAt: expirationTime,
                    commandName,
                    userId
                };
            }
        }

        return { onCooldown: false, timeLeft: 0 };
    }

    /**
     * Set cooldown for a user and command
     * @param {string} commandName - Name of the command
     * @param {string} userId - User ID
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {boolean} - Success status
     */
    setCooldown(commandName, userId, cooldownTime = 3) {
        try {
            if (!commandName || !userId) {
                return false;
            }

            if (!this.cooldowns.has(commandName)) {
                this.cooldowns.set(commandName, new Collection());
            }

            const timestamps = this.cooldowns.get(commandName);
            const now = Date.now();
            
            timestamps.set(userId, now);

            // Auto-cleanup after cooldown expires
            setTimeout(() => {
                if (timestamps.has(userId)) {
                    timestamps.delete(userId);
                }
            }, cooldownTime * 1000 + 1000); // Add 1 second buffer

            return true;
        } catch (error) {
            console.error('Error setting cooldown:', error);
            return false;
        }
    }

    /**
     * Check global cooldown (affects all users)
     * @param {string} key - Global cooldown key
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {Object} - Cooldown information
     */
    checkGlobalCooldown(key, cooldownTime = 10) {
        const now = Date.now();
        const cooldownMillis = cooldownTime * 1000;
        
        if (this.globalCooldowns.has(key)) {
            const lastUsed = this.globalCooldowns.get(key);
            const expirationTime = lastUsed + cooldownMillis;
            
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { 
                    onCooldown: true, 
                    timeLeft,
                    expiresAt: expirationTime,
                    key
                };
            }
        }
        
        return { onCooldown: false, timeLeft: 0 };
    }

    /**
     * Set global cooldown
     * @param {string} key - Global cooldown key
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {boolean} - Success status
     */
    setGlobalCooldown(key, cooldownTime = 10) {
        try {
            const now = Date.now();
            this.globalCooldowns.set(key, now);
            
            // Auto-cleanup
            setTimeout(() => {
                this.globalCooldowns.delete(key);
            }, cooldownTime * 1000 + 1000);
            
            return true;
        } catch (error) {
            console.error('Error setting global cooldown:', error);
            return false;
        }
    }

    /**
     * Check user-wide cooldown (across all commands)
     * @param {string} userId - User ID
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {Object} - Cooldown information
     */
    checkUserCooldown(userId, cooldownTime = 1) {
        const now = Date.now();
        const cooldownMillis = cooldownTime * 1000;
        
        if (this.userCooldowns.has(userId)) {
            const lastUsed = this.userCooldowns.get(userId);
            const expirationTime = lastUsed + cooldownMillis;
            
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { 
                    onCooldown: true, 
                    timeLeft,
                    expiresAt: expirationTime,
                    userId
                };
            }
        }
        
        return { onCooldown: false, timeLeft: 0 };
    }

    /**
     * Set user-wide cooldown
     * @param {string} userId - User ID
     * @param {number} cooldownTime - Cooldown time in seconds
     * @returns {boolean} - Success status
     */
    setUserCooldown(userId, cooldownTime = 1) {
        try {
            const now = Date.now();
            this.userCooldowns.set(userId, now);
            
            // Auto-cleanup
            setTimeout(() => {
                this.userCooldowns.delete(userId);
            }, cooldownTime * 1000 + 1000);
            
            return true;
        } catch (error) {
            console.error('Error setting user cooldown:', error);
            return false;
        }
    }

    /**
     * Remove cooldown for a user and command
     * @param {string} commandName - Name of the command
     * @param {string} userId - User ID
     * @returns {boolean} - Success status
     */
    removeCooldown(commandName, userId) {
        try {
            if (this.cooldowns.has(commandName)) {
                const timestamps = this.cooldowns.get(commandName);
                return timestamps.delete(userId);
            }
            return false;
        } catch (error) {
            console.error('Error removing cooldown:', error);
            return false;
        }
    }

    /**
     * Clear all cooldowns for a user
     * @param {string} userId - User ID
     * @returns {boolean} - Success status
     */
    clearUserCooldowns(userId) {
        try {
            let cleared = 0;
            
            for (const [commandName, timestamps] of this.cooldowns.entries()) {
                if (timestamps.has(userId)) {
                    timestamps.delete(userId);
                    cleared++;
                }
            }
            
            // Also clear user-wide cooldown
            if (this.userCooldowns.has(userId)) {
                this.userCooldowns.delete(userId);
                cleared++;
            }
            
            return cleared > 0;
        } catch (error) {
            console.error('Error clearing user cooldowns:', error);
            return false;
        }
    }

    /**
     * Get all active cooldowns for a user
     * @param {string} userId - User ID
     * @returns {Array} - Array of active cooldowns
     */
    getUserCooldowns(userId) {
        const activeCooldowns = [];
        const now = Date.now();
        
        try {
            for (const [commandName, timestamps] of this.cooldowns.entries()) {
                if (timestamps.has(userId)) {
                    const startTime = timestamps.get(userId);
                    activeCooldowns.push({
                        command: commandName,
                        startTime,
                        userId
                    });
                }
            }
            
            return activeCooldowns;
        } catch (error) {
            console.error('Error getting user cooldowns:', error);
            return [];
        }
    }

    /**
     * Get cooldown statistics
     * @returns {Object} - Cooldown statistics
     */
    getStats() {
        let totalCooldowns = 0;
        let activeCooldowns = 0;
        const now = Date.now();
        
        for (const [commandName, timestamps] of this.cooldowns.entries()) {
            totalCooldowns += timestamps.size;
            
            for (const [userId, timestamp] of timestamps.entries()) {
                if (now - timestamp < 300000) { // Active within last 5 minutes
                    activeCooldowns++;
                }
            }
        }
        
        return {
            totalCommands: this.cooldowns.size,
            totalCooldowns,
            activeCooldowns,
            globalCooldowns: this.globalCooldowns.size,
            userCooldowns: this.userCooldowns.size
        };
    }

    /**
     * Format time remaining in a human-readable format
     * @param {number} seconds - Seconds remaining
     * @returns {string} - Formatted time string
     */
    formatTimeRemaining(seconds) {
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            return remainingSeconds > 0 
                ? `${minutes}m ${remainingSeconds}s` 
                : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Clean up expired cooldowns
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        try {
            // Clean command cooldowns
            for (const [commandName, timestamps] of this.cooldowns.entries()) {
                const toDelete = [];
                
                for (const [userId, timestamp] of timestamps.entries()) {
                    // Remove cooldowns older than 1 hour
                    if (now - timestamp > 3600000) {
                        toDelete.push(userId);
                    }
                }
                
                for (const userId of toDelete) {
                    timestamps.delete(userId);
                    cleanedCount++;
                }
                
                // Remove empty command collections
                if (timestamps.size === 0) {
                    this.cooldowns.delete(commandName);
                }
            }
            
            // Clean global cooldowns
            for (const [key, timestamp] of this.globalCooldowns.entries()) {
                if (now - timestamp > 3600000) {
                    this.globalCooldowns.delete(key);
                    cleanedCount++;
                }
            }
            
            // Clean user cooldowns
            for (const [userId, timestamp] of this.userCooldowns.entries()) {
                if (now - timestamp > 3600000) {
                    this.userCooldowns.delete(userId);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`Cleaned up ${cleanedCount} expired cooldowns`);
            }
            
        } catch (error) {
            console.error('Error during cooldown cleanup:', error);
        }
    }

    /**
     * Destroy cooldown manager and clean up resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cooldowns.clear();
        this.globalCooldowns.clear();
        this.userCooldowns.clear();
    }
}

// Create singleton instance
const cooldownManager = new CooldownManager();

// Graceful shutdown
process.on('SIGINT', () => {
    cooldownManager.destroy();
});

process.on('SIGTERM', () => {
    cooldownManager.destroy();
});

module.exports = {
    CooldownManager,
    cooldownManager,
    
    // Legacy exports for backward compatibility
    checkCooldown: cooldownManager.checkCooldown.bind(cooldownManager),
    setCooldown: cooldownManager.setCooldown.bind(cooldownManager),
    removeCooldown: cooldownManager.removeCooldown.bind(cooldownManager),
    clearUserCooldowns: cooldownManager.clearUserCooldowns.bind(cooldownManager),
    getUserCooldowns: cooldownManager.getUserCooldowns.bind(cooldownManager),
    getStats: cooldownManager.getStats.bind(cooldownManager)
};
