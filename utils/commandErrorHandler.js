
const { EmbedBuilder } = require('discord.js');

class CommandErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.rateLimitMap = new Map();
    }

    /**
     * Handle command execution errors
     * @param {CommandInteraction} interaction - Discord interaction
     * @param {Error} error - The error that occurred
     * @param {string} commandName - Name of the command
     */
    async handleCommandError(interaction, error, commandName) {
        try {
            console.error(`Command Error in ${commandName}:`, error);

            // Rate limiting for error messages
            const userId = interaction.user.id;
            const rateLimitKey = `${userId}_${commandName}`;
            
            if (this.isRateLimited(rateLimitKey)) {
                return; // Don't spam error messages
            }

            this.setRateLimit(rateLimitKey);

            // Categorize error types
            const errorType = this.categorizeError(error);
            const errorEmbed = this.createErrorEmbed(errorType, commandName, error);

            // Track error frequency
            this.trackError(commandName, errorType);

            // Send appropriate response
            await this.safeErrorReply(interaction, errorEmbed);

        } catch (handlerError) {
            console.error('Error in error handler:', handlerError);
            await this.fallbackErrorReply(interaction);
        }
    }

    /**
     * Handle general interaction errors
     * @param {Interaction} interaction - Discord interaction
     * @param {Error} error - The error that occurred
     */
    async handleInteractionError(interaction, error) {
        try {
            console.error('Interaction Error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Interaction Error')
                .setDescription('An unexpected error occurred while processing your interaction.')
                .addFields([
                    { name: 'Error Type', value: error.name || 'Unknown', inline: true },
                    { name: 'Time', value: new Date().toISOString(), inline: true }
                ])
                .setFooter({ text: 'Please try again later or contact support if this persists.' })
                .setTimestamp();

            await this.safeErrorReply(interaction, errorEmbed);

        } catch (handlerError) {
            console.error('Error in interaction error handler:', handlerError);
            await this.fallbackErrorReply(interaction);
        }
    }

    /**
     * Handle button interaction errors
     * @param {ButtonInteraction} interaction - Button interaction
     * @param {Error} error - The error that occurred
     * @param {string} customId - Button custom ID
     */
    async handleButtonError(interaction, error, customId) {
        try {
            console.error(`Button Error (${customId}):`, error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔴 Button Error')
                .setDescription('Something went wrong with that button interaction.')
                .addFields([
                    { name: 'Button ID', value: customId || 'Unknown', inline: true },
                    { name: 'Error', value: error.message.slice(0, 100) + '...', inline: true }
                ])
                .setFooter({ text: 'Try refreshing the command or contact support.' })
                .setTimestamp();

            await this.safeErrorReply(interaction, errorEmbed);

        } catch (handlerError) {
            console.error('Error in button error handler:', handlerError);
            await this.fallbackErrorReply(interaction);
        }
    }

    /**
     * Categorize error types for better handling
     * @param {Error} error - The error to categorize
     * @returns {string} - Error category
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        const stack = error.stack?.toLowerCase() || '';

        if (message.includes('missing permissions') || message.includes('forbidden')) {
            return 'permissions';
        }
        
        if (message.includes('timeout') || message.includes('time out')) {
            return 'timeout';
        }
        
        if (message.includes('rate limit') || message.includes('too many requests')) {
            return 'ratelimit';
        }
        
        if (message.includes('database') || message.includes('sqlite')) {
            return 'database';
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        }
        
        if (message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        }
        
        if (stack.includes('discord.js')) {
            return 'discord';
        }
        
        return 'generic';
    }

    /**
     * Create appropriate error embed based on error type
     * @param {string} errorType - Type of error
     * @param {string} commandName - Command name
     * @param {Error} error - Original error
     * @returns {EmbedBuilder} - Error embed
     */
    createErrorEmbed(errorType, commandName, error) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: `Error ID: ${Date.now()}` });

        switch (errorType) {
            case 'permissions':
                return embed
                    .setColor('#FFA500')
                    .setTitle('🔒 Permission Error')
                    .setDescription(`I don't have the required permissions to execute \`${commandName}\`.`)
                    .addFields([
                        { name: 'Solution', value: 'Please check my server permissions or contact an administrator.', inline: false }
                    ]);

            case 'timeout':
                return embed
                    .setColor('#FFFF00')
                    .setTitle('⏰ Timeout Error')
                    .setDescription(`The \`${commandName}\` command took too long to respond.`)
                    .addFields([
                        { name: 'Solution', value: 'Please try again in a moment.', inline: false }
                    ]);

            case 'ratelimit':
                return embed
                    .setColor('#FF6600')
                    .setTitle('🚦 Rate Limit')
                    .setDescription('You\'re using commands too quickly!')
                    .addFields([
                        { name: 'Solution', value: 'Please wait a moment before trying again.', inline: false }
                    ]);

            case 'database':
                return embed
                    .setColor('#FF0000')
                    .setTitle('💾 Database Error')
                    .setDescription(`There was an issue accessing the database for \`${commandName}\`.`)
                    .addFields([
                        { name: 'Solution', value: 'This is usually temporary. Please try again in a moment.', inline: false }
                    ]);

            case 'network':
                return embed
                    .setColor('#FF4500')
                    .setTitle('🌐 Network Error')
                    .setDescription('There was a network connectivity issue.')
                    .addFields([
                        { name: 'Solution', value: 'Please check your connection and try again.', inline: false }
                    ]);

            case 'validation':
                return embed
                    .setColor('#FF1493')
                    .setTitle('📝 Validation Error')
                    .setDescription(`Invalid input provided for \`${commandName}\`.`)
                    .addFields([
                        { name: 'Solution', value: 'Please check your command syntax and try again.', inline: false }
                    ]);

            case 'discord':
                return embed
                    .setColor('#5865F2')
                    .setTitle('📡 Discord API Error')
                    .setDescription('There was an issue communicating with Discord.')
                    .addFields([
                        { name: 'Solution', value: 'This is usually temporary. Please try again shortly.', inline: false }
                    ]);

            default:
                return embed
                    .setColor('#FF0000')
                    .setTitle('❌ Command Error')
                    .setDescription(`An error occurred while executing \`${commandName}\`.`)
                    .addFields([
                        { name: 'Error', value: error.message.slice(0, 200) + (error.message.length > 200 ? '...' : ''), inline: false },
                        { name: 'Solution', value: 'Please try again later or contact support if this persists.', inline: false }
                    ]);
        }
    }

    /**
     * Safely send error reply with fallbacks
     * @param {Interaction} interaction - Discord interaction
     * @param {EmbedBuilder} embed - Error embed
     */
    async safeErrorReply(interaction, embed) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
            await this.fallbackErrorReply(interaction);
        }
    }

    /**
     * Fallback error reply for when embed fails
     * @param {Interaction} interaction - Discord interaction
     */
    async fallbackErrorReply(interaction) {
        try {
            const message = '❌ An error occurred. Please try again later.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: message, ephemeral: true });
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: message });
            } else {
                await interaction.followUp({ content: message, ephemeral: true });
            }
        } catch (fallbackError) {
            console.error('Even fallback error reply failed:', fallbackError);
        }
    }

    /**
     * Check if user is rate limited for error messages
     * @param {string} key - Rate limit key
     * @returns {boolean} - Whether user is rate limited
     */
    isRateLimited(key) {
        const now = Date.now();
        const limit = this.rateLimitMap.get(key);
        
        if (!limit) return false;
        
        if (now - limit < 5000) { // 5 second rate limit
            return true;
        }
        
        this.rateLimitMap.delete(key);
        return false;
    }

    /**
     * Set rate limit for error messages
     * @param {string} key - Rate limit key
     */
    setRateLimit(key) {
        this.rateLimitMap.set(key, Date.now());
        
        // Clean up old entries
        setTimeout(() => {
            this.rateLimitMap.delete(key);
        }, 10000);
    }

    /**
     * Track error frequency for monitoring
     * @param {string} commandName - Command name
     * @param {string} errorType - Error type
     */
    trackError(commandName, errorType) {
        const key = `${commandName}_${errorType}`;
        const count = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, count + 1);
        
        // Log if error frequency is high
        if (count > 5) {
            console.warn(`High error frequency detected: ${key} (${count + 1} times)`);
        }
    }

    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getErrorStats() {
        const stats = {};
        for (const [key, count] of this.errorCounts.entries()) {
            stats[key] = count;
        }
        return stats;
    }

    /**
     * Reset error tracking
     */
    resetErrorStats() {
        this.errorCounts.clear();
        this.rateLimitMap.clear();
    }
}

// Create singleton instance
const errorHandler = new CommandErrorHandler();

module.exports = {
    CommandErrorHandler,
    handleCommandError: errorHandler.handleCommandError.bind(errorHandler),
    handleInteractionError: errorHandler.handleInteractionError.bind(errorHandler),
    handleButtonError: errorHandler.handleButtonError.bind(errorHandler),
    
    // Legacy exports for backward compatibility
    async handleCommandError(interaction, error, commandName) {
        return await errorHandler.handleCommandError(interaction, error, commandName);
    },
    
    async handleInteractionError(interaction, error) {
        return await errorHandler.handleInteractionError(interaction, error);
    }
};
