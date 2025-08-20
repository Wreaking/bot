const { Collection } = require('discord.js');

class CooldownManager {
    constructor(options = {}) {
        this.cooldowns = new Collection();
        this.globalCooldowns = new Collection();
        this.options = {
            // Auto cleanup expired cooldowns every 5 minutes
            autoCleanup: options.autoCleanup !== false,
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000,
            // Maximum cooldowns per command to prevent memory issues
            maxCooldownsPerCommand: options.maxCooldownsPerCommand || 10000,
            // Default cooldown in seconds
            defaultCooldown: options.defaultCooldown || 3,
            ...options
        };

        // Start auto cleanup if enabled
        if (this.options.autoCleanup) {
            this.startAutoCleanup();
        }
    }

    /**
     * Check if a command is on cooldown
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {string} guildId - The guild's ID (optional, for server-specific cooldowns)
     * @returns {number|null} - Milliseconds remaining in cooldown, or null if no cooldown
     */
    checkCooldown(commandName, userId, guildId = null) {
        if (!commandName || !userId) {
            throw new Error('Command name and user ID are required');
        }

        const key = this.generateKey(commandName, guildId);
        
        if (!this.cooldowns.has(key)) {
            return null;
        }

        const timestamps = this.cooldowns.get(key);
        const cooldownEnd = timestamps.get(userId);
        
        if (!cooldownEnd) return null;

        const now = Date.now();
        if (now < cooldownEnd) {
            return cooldownEnd - now;
        }

        // Cooldown expired, clean it up
        timestamps.delete(userId);
        return null;
    }

    /**
     * Check if a command is on cooldown (returns seconds for backward compatibility)
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {string} guildId - The guild's ID (optional)
     * @returns {number|null} - Seconds remaining in cooldown, or null if no cooldown
     */
    checkCooldownSeconds(commandName, userId, guildId = null) {
        const cooldownMs = this.checkCooldown(commandName, userId, guildId);
        return cooldownMs ? Math.ceil(cooldownMs / 1000) : null;
    }

    /**
     * Set a cooldown for a command
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @param {string} guildId - The guild's ID (optional, for server-specific cooldowns)
     */
    setCooldown(commandName, userId, cooldownSeconds = null, guildId = null) {
        if (!commandName || !userId) {
            throw new Error('Command name and user ID are required');
        }

        const cooldown = cooldownSeconds || this.options.defaultCooldown;
        if (cooldown <= 0) {
            throw new Error('Cooldown must be a positive number');
        }

        const key = this.generateKey(commandName, guildId);
        
        if (!this.cooldowns.has(key)) {
            this.cooldowns.set(key, new Collection());
        }

        const timestamps = this.cooldowns.get(key);
        
        // Prevent memory issues by limiting cooldowns per command
        if (timestamps.size >= this.options.maxCooldownsPerCommand) {
            this.cleanupExpiredCooldowns(key);
            
            // If still at limit after cleanup, remove oldest entries
            if (timestamps.size >= this.options.maxCooldownsPerCommand) {
                const oldestEntries = Array.from(timestamps.entries())
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, Math.floor(this.options.maxCooldownsPerCommand * 0.1));
                
                oldestEntries.forEach(([id]) => timestamps.delete(id));
            }
        }

        timestamps.set(userId, Date.now() + (cooldown * 1000));
    }

    /**
     * Set a global cooldown (affects all commands)
     * @param {string} userId - The user's ID
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     */
    setGlobalCooldown(userId, cooldownSeconds) {
        if (!userId || cooldownSeconds <= 0) {
            throw new Error('Valid user ID and positive cooldown required');
        }

        this.globalCooldowns.set(userId, Date.now() + (cooldownSeconds * 1000));
    }

    /**
     * Check if a user has a global cooldown
     * @param {string} userId - The user's ID
     * @returns {number|null} - Milliseconds remaining, or null if no cooldown
     */
    checkGlobalCooldown(userId) {
        if (!userId) return null;

        const cooldownEnd = this.globalCooldowns.get(userId);
        if (!cooldownEnd) return null;

        const now = Date.now();
        if (now < cooldownEnd) {
            return cooldownEnd - now;
        }

        this.globalCooldowns.delete(userId);
        return null;
    }

    /**
     * Clear a user's cooldown for a command
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {string} guildId - The guild's ID (optional)
     */
    clearCooldown(commandName, userId, guildId = null) {
        if (!commandName || !userId) return false;

        const key = this.generateKey(commandName, guildId);
        const timestamps = this.cooldowns.get(key);
        
        if (timestamps && timestamps.has(userId)) {
            timestamps.delete(userId);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all cooldowns for a command
     * @param {string} commandName - The name of the command
     * @param {string} guildId - The guild's ID (optional)
     */
    clearCommandCooldowns(commandName, guildId = null) {
        if (!commandName) return false;

        const key = this.generateKey(commandName, guildId);
        return this.cooldowns.delete(key);
    }

    /**
     * Clear all cooldowns for a user
     * @param {string} userId - The user's ID
     */
    clearUserCooldowns(userId) {
        if (!userId) return 0;

        let clearedCount = 0;
        
        // Clear regular cooldowns
        this.cooldowns.forEach(timestamps => {
            if (timestamps.has(userId)) {
                timestamps.delete(userId);
                clearedCount++;
            }
        });

        // Clear global cooldown
        if (this.globalCooldowns.has(userId)) {
            this.globalCooldowns.delete(userId);
            clearedCount++;
        }

        return clearedCount;
    }

    /**
     * Clear all cooldowns
     */
    clearAllCooldowns() {
        const totalCleared = this.cooldowns.size + this.globalCooldowns.size;
        this.cooldowns.clear();
        this.globalCooldowns.clear();
        return totalCleared;
    }

    /**
     * Get remaining cooldown time with formatted string
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {string} guildId - The guild's ID (optional)
     * @returns {Object|null} - Object with ms, seconds, and formatted string, or null
     */
    getCooldownInfo(commandName, userId, guildId = null) {
        const cooldownMs = this.checkCooldown(commandName, userId, guildId);
        if (!cooldownMs) return null;

        const seconds = Math.ceil(cooldownMs / 1000);
        const formatted = this.formatTime(seconds);

        return {
            ms: cooldownMs,
            seconds,
            formatted
        };
    }

    /**
     * Get all active cooldowns for a user
     * @param {string} userId - The user's ID
     * @returns {Array} - Array of active cooldowns
     */
    getUserCooldowns(userId) {
        if (!userId) return [];

        const userCooldowns = [];

        // Check global cooldown
        const globalCooldown = this.checkGlobalCooldown(userId);
        if (globalCooldown) {
            userCooldowns.push({
                command: 'GLOBAL',
                remaining: globalCooldown,
                remainingSeconds: Math.ceil(globalCooldown / 1000),
                formatted: this.formatTime(Math.ceil(globalCooldown / 1000))
            });
        }

        // Check command cooldowns
        this.cooldowns.forEach((timestamps, key) => {
            if (timestamps.has(userId)) {
                const cooldownEnd = timestamps.get(userId);
                const now = Date.now();
                
                if (now < cooldownEnd) {
                    const remaining = cooldownEnd - now;
                    const [commandName, guildId] = this.parseKey(key);
                    
                    userCooldowns.push({
                        command: commandName,
                        guildId,
                        remaining,
                        remainingSeconds: Math.ceil(remaining / 1000),
                        formatted: this.formatTime(Math.ceil(remaining / 1000))
                    });
                }
            }
        });

        return userCooldowns;
    }

    /**
     * Get statistics about cooldowns
     * @returns {Object} - Statistics object
     */
    getStats() {
        let totalActiveCooldowns = 0;
        let totalCommands = this.cooldowns.size;

        this.cooldowns.forEach(timestamps => {
            totalActiveCooldowns += timestamps.size;
        });

        return {
            totalCommands,
            totalActiveCooldowns,
            globalCooldowns: this.globalCooldowns.size,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Estimate memory usage
     * @returns {Object} - Memory usage estimation
     */
    getMemoryUsage() {
        let estimatedBytes = 0;
        
        this.cooldowns.forEach((timestamps, key) => {
            estimatedBytes += key.length * 2; // Key string
            estimatedBytes += timestamps.size * 32; // Approximate size per entry
        });

        estimatedBytes += this.globalCooldowns.size * 32;

        return {
            bytes: estimatedBytes,
            kb: Math.round(estimatedBytes / 1024 * 100) / 100,
            mb: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100
        };
    }

    /**
     * Generate a unique key for command cooldowns
     * @param {string} commandName - The command name
     * @param {string} guildId - The guild ID (optional)
     * @returns {string} - The generated key
     */
    generateKey(commandName, guildId = null) {
        return guildId ? `${commandName}:${guildId}` : commandName;
    }

    /**
     * Parse a key back into command name and guild ID
     * @param {string} key - The key to parse
     * @returns {Array} - [commandName, guildId]
     */
    parseKey(key) {
        const parts = key.split(':');
        return parts.length > 1 ? [parts[0], parts[1]] : [parts[0], null];
    }

    /**
     * Format time in a human-readable way
     * @param {number} seconds - Seconds to format
     * @returns {string} - Formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        
        return `${hours}h`;
    }

    /**
     * Clean up expired cooldowns for a specific command
     * @param {string} key - The command key
     */
    cleanupExpiredCooldowns(key) {
        const timestamps = this.cooldowns.get(key);
        if (!timestamps) return 0;

        const now = Date.now();
        let cleaned = 0;

        timestamps.forEach((expireTime, userId) => {
            if (now >= expireTime) {
                timestamps.delete(userId);
                cleaned++;
            }
        });

        return cleaned;
    }

    /**
     * Clean up all expired cooldowns
     * @returns {number} - Number of cooldowns cleaned
     */
    cleanupAllExpired() {
        let totalCleaned = 0;
        const now = Date.now();

        // Clean regular cooldowns
        this.cooldowns.forEach((timestamps, key) => {
            const sizeBefore = timestamps.size;
            timestamps.forEach((expireTime, userId) => {
                if (now >= expireTime) {
                    timestamps.delete(userId);
                }
            });
            
            // If collection is empty, remove it entirely
            if (timestamps.size === 0) {
                this.cooldowns.delete(key);
            }
            
            totalCleaned += sizeBefore - timestamps.size;
        });

        // Clean global cooldowns
        this.globalCooldowns.forEach((expireTime, userId) => {
            if (now >= expireTime) {
                this.globalCooldowns.delete(userId);
                totalCleaned++;
            }
        });

        return totalCleaned;
    }

    /**
     * Start automatic cleanup of expired cooldowns
     */
    startAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            const cleaned = this.cleanupAllExpired();
            if (cleaned > 0) {
                console.log(`[CooldownManager] Cleaned up ${cleaned} expired cooldowns`);
            }
        }, this.options.cleanupInterval);

        // Don't keep the process alive just for cleanup
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Stop automatic cleanup
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Destroy the cooldown manager and clean up resources
     */
    destroy() {
        this.stopAutoCleanup();
        this.clearAllCooldowns();
    }
}

// Create singleton instance
const cooldownManager = new CooldownManager();

// Export both the class and singleton instance
module.exports = {
    CooldownManager,
    cooldownManager,
    // For backward compatibility
    default: cooldownManager
};