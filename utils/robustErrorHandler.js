const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class RobustErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.cleanupInterval = null;
        this.startCleanupTimer();
    }

    startCleanupTimer() {
        // Clean up old logs every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldLogs();
        }, 300000);
    }

    cleanupOldLogs() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        this.errorLog = this.errorLog.filter(log => log.timestamp > cutoff);

        // Clean up rate limits older than 1 hour
        const rateLimitCutoff = Date.now() - (60 * 60 * 1000);
        for (const [key, timestamp] of this.rateLimits.entries()) {
            if (timestamp < rateLimitCutoff) {
                this.rateLimits.delete(key);
            }
        }
    }

    /**
     * Main error handling entry point
     * @param {Interaction} interaction - Discord interaction
     * @param {Error} error - The error that occurred
     * @param {string} context - Context information
     */
    async handleError(interaction, error, context = 'unknown') {
        try {
            // Log the error
            this.logError(error, context, interaction);

            // Check if user is hitting error rate limits
            if (this.isUserRateLimited(interaction.user.id)) {
                return; // Don't spam users with error messages
            }

            // Determine error severity and type
            const errorInfo = this.analyzeError(error);

            // Handle based on error type
            switch (errorInfo.type) {
                case 'discord_api':
                    await this.handleDiscordAPIError(interaction, error, errorInfo);
                    break;
                case 'permission':
                    await this.handlePermissionError(interaction, error, errorInfo);
                    break;
                case 'validation':
                    await this.handleValidationError(interaction, error, errorInfo);
                    break;
                case 'database':
                    await this.handleDatabaseError(interaction, error, errorInfo);
                    break;
                case 'timeout':
                    await this.handleTimeoutError(interaction, error, errorInfo);
                    break;
                case 'network':
                    await this.handleNetworkError(interaction, error, errorInfo);
                    break;
                default:
                    await this.handleGenericError(interaction, error, errorInfo);
            }

            // Set rate limit for user
            this.setUserRateLimit(interaction.user.id);

        } catch (handlerError) {
            console.error('Critical error in error handler:', handlerError);
            await this.emergencyResponse(interaction);
        }
    }

    /**
     * Handle command-specific errors
     * @param {CommandInteraction} interaction - Command interaction
     * @param {Error} error - The error
     * @param {string} commandName - Command name
     */
    async handleCommandError(interaction, error, commandName) {
        await this.handleError(interaction, error, `command:${commandName}`);
    }

    /**
     * Handle button interaction errors
     * @param {ButtonInteraction} interaction - Button interaction
     * @param {Error} error - The error
     * @param {string} customId - Button custom ID
     */
    async handleButtonError(interaction, error, customId) {
        await this.handleError(interaction, error, `button:${customId}`);
    }

    /**
     * Handle select menu errors
     * @param {SelectMenuInteraction} interaction - Select menu interaction
     * @param {Error} error - The error
     * @param {string} customId - Select menu custom ID
     */
    async handleSelectMenuError(interaction, error, customId) {
        await this.handleError(interaction, error, `select_menu:${customId}`);
    }

    /**
     * Handle modal errors
     * @param {ModalSubmitInteraction} interaction - Modal interaction
     * @param {Error} error - The error
     * @param {string} customId - Modal custom ID
     */
    async handleModalError(interaction, error, customId) {
        await this.handleError(interaction, error, `modal:${customId}`);
    }

    /**
     * Analyze error to determine type and severity
     * @param {Error} error - The error to analyze
     * @returns {Object} - Error analysis
     */
    analyzeError(error) {
        const message = error.message.toLowerCase();
        const stack = error.stack?.toLowerCase() || '';
        const code = error.code;

        let type = 'generic';
        let severity = 'medium';
        let userFriendly = true;
        let retryable = true;

        // Discord API errors
        if (code === 'TOKEN_INVALID' || code === 'DISALLOWED_INTENTS') {
            type = 'discord_api';
            severity = 'critical';
            userFriendly = false;
            retryable = false;
        } else if (code === 'MISSING_PERMISSIONS' || message.includes('missing permissions')) {
            type = 'permission';
            severity = 'low';
            retryable = false;
        } else if (code === 'INTERACTION_TIMEOUT' || message.includes('timeout')) {
            type = 'timeout';
            severity = 'medium';
            retryable = true;
        } else if (message.includes('rate limit') || code === 'RATE_LIMITED') {
            type = 'rate_limit';
            severity = 'medium';
            retryable = true;
        }

        // Validation errors
        else if (message.includes('validation') || message.includes('invalid')) {
            type = 'validation';
            severity = 'low';
            retryable = false;
        }

        // Database errors
        else if (message.includes('database') || message.includes('sqlite') || message.includes('sql')) {
            type = 'database';
            severity = 'high';
            retryable = true;
        }

        // Network errors
        else if (message.includes('network') || message.includes('fetch') || message.includes('enotfound')) {
            type = 'network';
            severity = 'medium';
            retryable = true;
        }

        // Critical errors
        else if (message.includes('out of memory') || message.includes('maximum call stack')) {
            type = 'critical';
            severity = 'critical';
            userFriendly = false;
            retryable = false;
        }

        return {
            type,
            severity,
            userFriendly,
            retryable,
            code,
            message: error.message
        };
    }

    /**
     * Handle Discord API errors
     */
    async handleDiscordAPIError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📡 Discord API Issue')
            .setDescription('There\'s a temporary issue with Discord\'s servers.')
            .addFields([
                { name: 'What happened?', value: 'Discord is experiencing connectivity issues.', inline: false },
                { name: 'What can you do?', value: 'Wait a moment and try again. This usually resolves quickly.', inline: false }
            ])
            .setFooter({ text: 'Status: discord.com/status' })
            .setTimestamp();

        if (errorInfo.retryable) {
            const retryButton = new ButtonBuilder()
                .setCustomId(`retry_${Date.now()}`)
                .setLabel('Try Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const row = new ActionRowBuilder().addComponents(retryButton);
            await this.safeReply(interaction, { embeds: [embed], components: [row] });
        } else {
            await this.safeReply(interaction, { embeds: [embed] });
        }
    }

    /**
     * Handle permission errors
     */
    async handlePermissionError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔒 Permission Required')
            .setDescription('I don\'t have the necessary permissions to complete this action.')
            .addFields([
                { name: 'Required Permission', value: this.extractPermission(error.message) || 'Unknown', inline: true },
                { name: 'Solution', value: 'Contact a server administrator to check my permissions.', inline: false }
            ])
            .setFooter({ text: 'This is usually a server configuration issue.' })
            .setTimestamp();

        await this.safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    /**
     * Handle validation errors
     */
    async handleValidationError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('📝 Input Error')
            .setDescription('There was an issue with the information provided.')
            .addFields([
                { name: 'Error Details', value: this.sanitizeErrorMessage(error.message), inline: false },
                { name: 'Solution', value: 'Please check your input and try again.', inline: false }
            ])
            .setTimestamp();

        await this.safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    /**
     * Handle database errors
     */
    async handleDatabaseError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💾 Database Temporarily Unavailable')
            .setDescription('Our database is experiencing issues. Your progress is safe!')
            .addFields([
                { name: 'What\'s happening?', value: 'Database connectivity issues (usually temporary)', inline: false },
                { name: 'Your data', value: '✅ Safe and will be restored automatically', inline: false },
                { name: 'What to do', value: 'Wait 1-2 minutes and try again', inline: false }
            ])
            .setFooter({ text: 'If this persists, contact support' })
            .setTimestamp();

        const retryButton = new ButtonBuilder()
            .setCustomId(`retry_db_${Date.now()}`)
            .setLabel('Try Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');

        const row = new ActionRowBuilder().addComponents(retryButton);
        await this.safeReply(interaction, { embeds: [embed], components: [row] });
    }

    /**
     * Handle timeout errors
     */
    async handleTimeoutError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('⏰ Request Timed Out')
            .setDescription('The operation took longer than expected to complete.')
            .addFields([
                { name: 'What happened?', value: 'The server was busy or experiencing high load.', inline: false },
                { name: 'Solution', value: 'Wait a moment and try again. Performance usually improves quickly.', inline: false }
            ])
            .setTimestamp();

        const retryButton = new ButtonBuilder()
            .setCustomId(`retry_timeout_${Date.now()}`)
            .setLabel('Retry')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏱️');

        const row = new ActionRowBuilder().addComponents(retryButton);
        await this.safeReply(interaction, { embeds: [embed], components: [row] });
    }

    /**
     * Handle network errors
     */
    async handleNetworkError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🌐 Network Issue')
            .setDescription('There was a problem connecting to external services.')
            .addFields([
                { name: 'Cause', value: 'Network connectivity or external service issue', inline: false },
                { name: 'Solution', value: 'This usually resolves itself. Try again in a moment.', inline: false }
            ])
            .setTimestamp();

        await this.safeReply(interaction, { embeds: [embed] });
    }

    /**
     * Handle generic errors
     */
    async handleGenericError(interaction, error, errorInfo) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Something Went Wrong')
            .setDescription('An unexpected error occurred. Our team has been notified.')
            .addFields([
                { name: 'Error ID', value: `\`${Date.now().toString(36)}\``, inline: true },
                { name: 'Time', value: new Date().toLocaleString(), inline: true },
                { name: 'What to do', value: 'Try again later or contact support if this persists.', inline: false }
            ])
            .setFooter({ text: 'This error has been automatically reported.' })
            .setTimestamp();

        if (errorInfo.retryable) {
            const retryButton = new ButtonBuilder()
                .setCustomId(`retry_generic_${Date.now()}`)
                .setLabel('Try Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const supportButton = new ButtonBuilder()
                .setCustomId(`support_${Date.now()}`)
                .setLabel('Get Help')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/support') // Replace with your support server
                .setEmoji('🆘');

            const row = new ActionRowBuilder().addComponents(retryButton, supportButton);
            await this.safeReply(interaction, { embeds: [embed], components: [row] });
        } else {
            await this.safeReply(interaction, { embeds: [embed] });
        }
    }

    /**
     * Emergency response when all else fails
     */
    async emergencyResponse(interaction) {
        try {
            const message = '🚨 Critical error occurred. Please try again later.';

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: message, ephemeral: true });
            } else {
                await interaction.followUp({ content: message, ephemeral: true });
            }
        } catch (emergencyError) {
            console.error('Emergency response failed:', emergencyError);
        }
    }

    /**
     * Safely reply to interaction with multiple fallbacks
     */
    async safeReply(interaction, options) {
        try {
            if (!interaction || !interaction.isRepliable()) {
                return false;
            }

            // Ensure ephemeral for error messages
            options.ephemeral = options.ephemeral !== false;

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(options);
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply(options);
            } else {
                await interaction.followUp(options);
            }
            return true;
        } catch (error) {
            console.error('Failed to send error response:', error);
            return false;
        }
    }

    /**
     * Utility methods
     */
    logError(error, context, interaction) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            user: interaction?.user?.id,
            guild: interaction?.guild?.id,
            command: interaction?.commandName || 'unknown'
        };

        this.errorLog.push(logEntry);

        // Maintain log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // Count errors
        const errorKey = `${context}:${error.message}`;
        this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);
    }

    isUserRateLimited(userId) {
        const now = Date.now();
        const userLimits = this.userErrorLimits.get(userId) || { count: 0, resetTime: now };

        if (now > userLimits.resetTime) {
            // Reset the limit window (5 minutes)
            this.userErrorLimits.set(userId, { count: 0, resetTime: now + 300000 });
            return false;
        }

        return userLimits.count >= 3; // Max 3 error messages per 5 minutes
    }

    setUserRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.userErrorLimits.get(userId) || { count: 0, resetTime: now + 300000 };

        userLimits.count++;
        this.userErrorLimits.set(userId, userLimits);
    }

    extractPermission(message) {
        const permissionMatch = message.match(/Missing Permissions?: (.+)/i);
        return permissionMatch ? permissionMatch[1] : null;
    }

    sanitizeErrorMessage(message) {
        // Remove sensitive information and limit length
        return message
            .replace(/at .+:\d+:\d+/g, '') // Remove stack trace references
            .replace(/\/[^\s]+\//g, '') // Remove file paths
            .substring(0, 200);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.errorLog.length,
            errorCounts: Object.fromEntries(this.errorCount),
            userRateLimits: this.userErrorLimits.size,
            recentErrors: this.errorLog.slice(-10)
        };
    }

    /**
     * Clear error logs
     */
    clearLogs() {
        this.errorLog = [];
        this.errorCount.clear();
        this.userErrorLimits.clear();
    }
}

// Create singleton instance
const robustErrorHandler = new RobustErrorHandler();

module.exports = {
    RobustErrorHandler,
    handleError: robustErrorHandler.handleError.bind(robustErrorHandler),
    handleCommandError: robustErrorHandler.handleCommandError.bind(robustErrorHandler),
    handleButtonError: robustErrorHandler.handleButtonError.bind(robustErrorHandler),
    handleSelectMenuError: robustErrorHandler.handleSelectMenuError.bind(robustErrorHandler),
    handleModalError: robustErrorHandler.handleModalError.bind(robustErrorHandler),
    getErrorStats: robustErrorHandler.getErrorStats.bind(robustErrorHandler),
    clearLogs: robustErrorHandler.clearLogs.bind(robustErrorHandler)
};