const { Collection, PermissionsBitField, EmbedBuilder } = require('discord.js');

class EnhancedErrorHandler {
    constructor(options = {}) {
        this.options = {
            // Error handling settings
            useEmbeds: options.useEmbeds !== false,
            logToConsole: options.logToConsole !== false,
            logToFile: options.logToFile || false,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            
            // Cooldown settings
            defaultCooldown: options.defaultCooldown || 3,
            maxCooldownsInMemory: options.maxCooldownsInMemory || 10000,
            
            // Response settings
            ephemeralErrors: options.ephemeralErrors !== false,
            includeErrorCode: options.includeErrorCode || false,
            customErrorMessages: options.customErrorMessages || {},
            
            // Database settings
            useDatabase: options.useDatabase || false,
            database: options.database || null,
            
            ...options
        };

        // In-memory cooldown storage (fallback)
        this.cooldowns = new Collection();
        this.errorCounts = new Collection();
        this.retryQueue = new Collection();
        
        // Error logging
        this.errorLog = [];
        this.maxLogEntries = options.maxLogEntries || 1000;
        
        // Auto-cleanup for memory management
        if (options.autoCleanup !== false) {
            this.startAutoCleanup();
        }
    }

    /**
     * Handle command errors gracefully with enhanced features
     * @param {Interaction} interaction - The Discord interaction
     * @param {Error} error - The error that occurred
     * @param {string} commandName - The name of the command that failed
     * @param {Object} options - Additional options
     */
    async handleCommandError(interaction, error, commandName, options = {}) {
        try {
            // Log the error
            this.logError(error, commandName, interaction);
            
            // Check if this is a retryable error
            if (this.isRetryableError(error) && options.retry !== false) {
                const retryResult = await this.handleRetry(interaction, error, commandName);
                if (retryResult.success) return;
            }

            const errorInfo = this.parseError(error);
            const customMessage = this.options.customErrorMessages[errorInfo.type] || errorInfo.message;
            
            // Create response
            const response = await this.createErrorResponse(
                customMessage, 
                commandName, 
                errorInfo,
                options
            );

            // Send error response
            await this.sendErrorResponse(interaction, response);

        } catch (handlerError) {
            console.error('Critical error in error handler:', handlerError);
            
            // Fallback error response
            try {
                const fallbackMessage = "❌ An unexpected error occurred. Please try again later.";
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: fallbackMessage, ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: fallbackMessage });
                } else {
                    await interaction.followUp({ content: fallbackMessage, ephemeral: true });
                }
            } catch (fallbackError) {
                console.error('Failed to send fallback error message:', fallbackError);
            }
        }
    }

    /**
     * Parse error to extract useful information
     * @param {Error} error - The error to parse
     * @returns {Object} - Parsed error information
     */
    parseError(error) {
        const errorInfo = {
            message: 'An unknown error occurred',
            type: 'UNKNOWN',
            code: null,
            retryable: false
        };

        if (!error) return errorInfo;

        // Discord API errors
        if (error.code) {
            errorInfo.code = error.code;
            errorInfo.type = 'DISCORD_API';
            
            switch (error.code) {
                case 50013:
                    errorInfo.message = 'Missing permissions to perform this action';
                    break;
                case 50001:
                    errorInfo.message = 'Missing access to perform this action';
                    break;
                case 50007:
                    errorInfo.message = 'Cannot send direct messages to this user';
                    break;
                case 50035:
                    errorInfo.message = 'Invalid form body or invalid input provided';
                    break;
                case 10003:
                case 10004:
                case 10013:
                case 10062:
                    errorInfo.message = 'Required resource not found';
                    break;
                case 20022:
                    errorInfo.message = 'This interaction has already been acknowledged';
                    break;
                case 40060:
                    errorInfo.message = 'Interaction has already been acknowledged';
                    break;
                default:
                    errorInfo.message = error.message || `Discord API Error (${error.code})`;
            }
        }
        // Custom application errors
        else if (error.type) {
            errorInfo.type = error.type;
            errorInfo.retryable = error.retryable || false;
            
            switch (error.type) {
                case 'DATABASE_ERROR':
                    errorInfo.message = 'Database temporarily unavailable';
                    errorInfo.retryable = true;
                    break;
                case 'VALIDATION_ERROR':
                    errorInfo.message = error.message || 'Invalid input provided';
                    break;
                case 'COOLDOWN_ACTIVE':
                    errorInfo.message = `Command is on cooldown. Please wait ${error.timeLeft}s`;
                    break;
                case 'INSUFFICIENT_PERMISSIONS':
                    errorInfo.message = 'You do not have permission to use this command';
                    break;
                case 'RATE_LIMITED':
                    errorInfo.message = 'Rate limited. Please slow down';
                    errorInfo.retryable = true;
                    break;
                default:
                    errorInfo.message = error.message || 'An application error occurred';
            }
        }
        // Network/timeout errors
        else if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
            errorInfo.type = 'TIMEOUT';
            errorInfo.message = 'Request timed out. Please try again';
            errorInfo.retryable = true;
        }
        // JavaScript errors
        else {
            errorInfo.type = error.name || 'JAVASCRIPT_ERROR';
            errorInfo.message = error.message || 'An unexpected error occurred';
            
            if (error.name === 'TypeError' || error.name === 'ReferenceError') {
                errorInfo.retryable = false;
            }
        }

        return errorInfo;
    }

    /**
     * Create error response (embed or text)
     * @param {string} message - Error message
     * @param {string} commandName - Command name
     * @param {Object} errorInfo - Parsed error info
     * @param {Object} options - Response options
     * @returns {Object} - Response object
     */
    async createErrorResponse(message, commandName, errorInfo, options = {}) {
        if (this.options.useEmbeds && !options.noEmbed) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Command Error')
                .setDescription(message)
                .addFields(
                    { name: 'Command', value: `\`${commandName}\``, inline: true },
                    { name: 'Error Type', value: errorInfo.type, inline: true }
                )
                .setTimestamp();

            if (this.options.includeErrorCode && errorInfo.code) {
                embed.addFields({ name: 'Error Code', value: `${errorInfo.code}`, inline: true });
            }

            if (errorInfo.retryable) {
                embed.setFooter({ text: 'This error may be temporary. Please try again.' });
            } else {
                embed.setFooter({ text: 'If this persists, please contact support.' });
            }

            return { embeds: [embed], ephemeral: this.options.ephemeralErrors };
        } else {
            const prefix = errorInfo.retryable ? '⏳' : '❌';
            const suffix = errorInfo.retryable 
                ? ' (Temporary error - please retry)' 
                : ' (If this persists, contact support)';
            
            return { 
                content: `${prefix} ${message}${suffix}`, 
                ephemeral: this.options.ephemeralErrors 
            };
        }
    }

    /**
     * Send error response to user
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} response - Response object
     */
    async sendErrorResponse(interaction, response) {
        if (!interaction || !interaction.isRepliable()) {
            console.warn('Cannot send error response: Invalid interaction');
            return;
        }

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(response);
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply(response);
            } else {
                // Try followUp if already replied
                response.ephemeral = true; // Force ephemeral for followups
                await interaction.followUp(response);
            }
        } catch (sendError) {
            console.error('Failed to send error response:', sendError);
            
            // Last resort - try basic text response
            try {
                const basicResponse = { content: '❌ An error occurred', ephemeral: true };
                if (!interaction.replied) {
                    await interaction.reply(basicResponse);
                }
            } catch (finalError) {
                console.error('All error response methods failed:', finalError);
            }
        }
    }

    /**
     * Enhanced permission validation
     * @param {Interaction} interaction - The Discord interaction
     * @param {string[]|Object} requiredPermissions - Required permissions (array or object with user/bot keys)
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    validatePermissions(interaction, requiredPermissions = [], options = {}) {
        const result = {
            valid: true,
            missing: {
                user: [],
                bot: []
            },
            errors: []
        };

        if (!interaction.member && requiredPermissions.length > 0) {
            result.valid = false;
            result.errors.push('This command can only be used in a server');
            return result;
        }

        // Handle different permission formats
        let userPerms = [];
        let botPerms = [];

        if (Array.isArray(requiredPermissions)) {
            userPerms = requiredPermissions;
        } else if (typeof requiredPermissions === 'object') {
            userPerms = requiredPermissions.user || [];
            botPerms = requiredPermissions.bot || [];
        }

        // Check user permissions
        if (userPerms.length > 0 && interaction.member) {
            for (const permission of userPerms) {
                const permFlag = typeof permission === 'string' 
                    ? PermissionsBitField.Flags[permission]
                    : permission;
                    
                if (!interaction.member.permissions.has(permFlag)) {
                    result.missing.user.push(permission);
                }
            }
        }

        // Check bot permissions
        if (botPerms.length > 0 && interaction.guild) {
            const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
            if (botMember) {
                const permissions = interaction.channel 
                    ? interaction.channel.permissionsFor(botMember)
                    : botMember.permissions;

                for (const permission of botPerms) {
                    const permFlag = typeof permission === 'string' 
                        ? PermissionsBitField.Flags[permission]
                        : permission;
                        
                    if (!permissions.has(permFlag)) {
                        result.missing.bot.push(permission);
                    }
                }
            }
        }

        // Determine if validation failed
        if (result.missing.user.length > 0) {
            result.valid = false;
            result.errors.push(`You are missing permissions: ${result.missing.user.join(', ')}`);
        }

        if (result.missing.bot.length > 0) {
            result.valid = false;
            result.errors.push(`Bot is missing permissions: ${result.missing.bot.join(', ')}`);
        }

        return result;
    }

    /**
     * Enhanced cooldown checking with database fallback
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @param {Object} options - Additional options
     * @returns {Object} - Cooldown information
     */
    async checkCooldown(commandName, userId, cooldownSeconds = null, options = {}) {
        const cooldown = cooldownSeconds || this.options.defaultCooldown;
        const key = `cooldown_${commandName}_${userId}`;
        const guildKey = options.guildId ? `${key}_${options.guildId}` : key;

        try {
            let cooldownEnd = null;

            // Try database first if available
            if (this.options.useDatabase && this.options.database) {
                try {
                    cooldownEnd = await this.options.database.get(guildKey);
                } catch (dbError) {
                    console.warn('Database cooldown check failed, using memory fallback:', dbError);
                }
            }

            // Fallback to memory storage
            if (cooldownEnd === null) {
                cooldownEnd = this.cooldowns.get(guildKey);
            }

            if (!cooldownEnd) {
                return { active: false, remaining: 0 };
            }

            const now = Date.now();
            const timeLeft = Math.ceil((cooldownEnd - now) / 1000);

            if (timeLeft > 0) {
                return {
                    active: true,
                    remaining: timeLeft,
                    formatted: this.formatCooldownTime(timeLeft)
                };
            } else {
                // Clean up expired cooldown
                await this.clearCooldown(commandName, userId, options);
                return { active: false, remaining: 0 };
            }

        } catch (error) {
            console.error('Cooldown check error:', error);
            // Return no cooldown on error to avoid blocking users
            return { active: false, remaining: 0 };
        }
    }

    /**
     * Set command cooldown with database support
     * @param {string} commandName - The name of the command
     * @param {string} userId - The user's ID
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @param {Object} options - Additional options
     */
    async setCooldown(commandName, userId, cooldownSeconds = null, options = {}) {
        const cooldown = cooldownSeconds || this.options.defaultCooldown;
        const key = `cooldown_${commandName}_${userId}`;
        const guildKey = options.guildId ? `${key}_${options.guildId}` : key;
        const expireTime = Date.now() + (cooldown * 1000);

        try {
            // Try database first if available
            if (this.options.useDatabase && this.options.database) {
                try {
                    await this.options.database.set(guildKey, expireTime);
                } catch (dbError) {
                    console.warn('Database cooldown set failed, using memory fallback:', dbError);
                }
            }

            // Always store in memory as backup/fallback
            this.cooldowns.set(guildKey, expireTime);

            // Prevent memory leaks
            if (this.cooldowns.size > this.options.maxCooldownsInMemory) {
                this.cleanupExpiredCooldowns();
            }

        } catch (error) {
            console.error('Error setting cooldown:', error);
        }
    }

    /**
     * Clear specific cooldown
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     * @param {Object} options - Additional options
     */
    async clearCooldown(commandName, userId, options = {}) {
        const key = `cooldown_${commandName}_${userId}`;
        const guildKey = options.guildId ? `${key}_${options.guildId}` : key;

        try {
            if (this.options.useDatabase && this.options.database) {
                await this.options.database.delete(guildKey);
            }
            this.cooldowns.delete(guildKey);
        } catch (error) {
            console.error('Error clearing cooldown:', error);
        }
    }

    /**
     * Format cooldown time for display
     * @param {number} seconds - Seconds remaining
     * @returns {string} - Formatted time
     */
    formatCooldownTime(seconds) {
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
        
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    /**
     * Check if error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} - Whether error is retryable
     */
    isRetryableError(error) {
        if (!error) return false;

        // Discord rate limits
        if (error.code === 429) return true;
        
        // Timeout errors
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') return true;
        
        // Custom retryable errors
        if (error.retryable === true) return true;
        
        // Database connection errors
        if (error.type === 'DATABASE_ERROR') return true;
        
        return false;
    }

    /**
     * Handle retry logic
     * @param {Interaction} interaction - Discord interaction
     * @param {Error} error - Original error
     * @param {string} commandName - Command name
     * @returns {Object} - Retry result
     */
    async handleRetry(interaction, error, commandName) {
        const retryKey = `${interaction.id}_${commandName}`;
        const currentRetries = this.retryQueue.get(retryKey) || 0;

        if (currentRetries >= this.options.maxRetries) {
            this.retryQueue.delete(retryKey);
            return { success: false, reason: 'Max retries exceeded' };
        }

        // Increment retry count
        this.retryQueue.set(retryKey, currentRetries + 1);

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * (currentRetries + 1)));

        try {
            // Attempt to re-execute the original command
            // This would need to be implemented based on your command structure
            return { success: true };
        } catch (retryError) {
            return { success: false, error: retryError };
        }
    }

    /**
     * Log errors with different levels
     * @param {Error} error - The error to log
     * @param {string} context - Error context
     * @param {Interaction} interaction - Discord interaction
     */
    logError(error, context, interaction = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                name: error?.name || 'Unknown',
                message: error?.message || 'No message',
                stack: error?.stack || 'No stack trace',
                code: error?.code || null,
                type: error?.type || null
            },
            context,
            user: interaction?.user ? {
                id: interaction.user.id,
                tag: interaction.user.tag
            } : null,
            guild: interaction?.guild ? {
                id: interaction.guild.id,
                name: interaction.guild.name
            } : null
        };

        // Store in memory log
        this.errorLog.push(logEntry);
        if (this.errorLog.length > this.maxLogEntries) {
            this.errorLog.shift(); // Remove oldest entry
        }

        // Console logging
        if (this.options.logToConsole) {
            console.error(`[${logEntry.timestamp}] Error in ${context}:`, logEntry.error);
        }

        // File logging (if enabled)
        if (this.options.logToFile && this.options.logFile) {
            // Implementation would depend on your logging library
            // Example: fs.appendFileSync(this.options.logFile, JSON.stringify(logEntry) + '\n');
        }
    }

    /**
     * Clean up expired cooldowns from memory
     */
    cleanupExpiredCooldowns() {
        const now = Date.now();
        let cleaned = 0;

        this.cooldowns.forEach((expireTime, key) => {
            if (now >= expireTime) {
                this.cooldowns.delete(key);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            console.log(`[ErrorHandler] Cleaned up ${cleaned} expired cooldowns`);
        }
    }

    /**
     * Start auto cleanup timer
     */
    startAutoCleanup() {
        // Clean up expired cooldowns every 5 minutes
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredCooldowns();
        }, 5 * 60 * 1000);

        // Don't keep process alive
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getStats() {
        return {
            errorLogEntries: this.errorLog.length,
            activeCooldowns: this.cooldowns.size,
            activeRetries: this.retryQueue.size,
            options: this.options
        };
    }

    /**
     * Clear all data
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cooldowns.clear();
        this.errorLog.length = 0;
        this.retryQueue.clear();
    }
}

// Create singleton instance
const errorHandler = new EnhancedErrorHandler();

// Export both class and instance
module.exports = {
    EnhancedErrorHandler,
    errorHandler,
    // For backward compatibility
    handleCommandError: errorHandler.handleCommandError.bind(errorHandler),
    validatePermissions: errorHandler.validatePermissions.bind(errorHandler),
    checkCooldown: errorHandler.checkCooldown.bind(errorHandler),
    setCooldown: errorHandler.setCooldown.bind(errorHandler)
};