const { EmbedBuilder } = require('discord.js');

class ErrorHandler {
    static getErrorMessage(error) {
        if (!error) return 'An unknown error occurred.';

        // Check for specific Discord API error codes
        if (error.code) {
            switch (error.code) {
                case 50013: return 'I don\'t have the required permissions to perform this action.';
                case 50001: return 'I don\'t have access to perform this action.';
                case 50006: return 'There was nothing to display.';
                case 50007: return 'I cannot send you direct messages. Please check your privacy settings.';
                case 50008: return 'I cannot send messages in voice channels.';
                case 50035: return 'Invalid input provided.';
                case 50021: return 'I cannot execute this action on a system message.';
                case 50024: return 'I cannot execute this action on this channel type.';
                case 50025: return 'Invalid OAuth2 access token provided.';
                case 50034: return 'A message can only be pinned to the channel it was sent in.';
                case 50036: return 'Bulk delete cannot be used on messages older than 14 days.';
                case 50074: return 'Cannot delete a channel required for Community guilds.';
                case 10003:
                case 10004:
                case 10013:
                case 10014:
                case 10015:
                case 10062: return 'Required information could not be found.';
                case 20022: return 'This interaction has already been acknowledged.';
                case 40005: return 'Request entity too large. File size exceeds maximum allowed.';
                case 40060: return 'Interaction has already been acknowledged.';
                default: return `Discord API Error (${error.code}): ${error.message || 'An unexpected error occurred.'}`;
            }
        }

        // Check for Discord.js specific errors
        if (error.name === 'DiscordAPIError') {
            return `Discord API Error: ${error.message}`;
        }

        // Check for custom application error types
        if (error.type) {
            switch (error.type) {
                case 'DATABASE_ERROR': 
                    return 'There was an error accessing the database. Please try again later.';
                case 'VALIDATION_ERROR': 
                    return `Invalid input: ${error.message || 'Please check your input and try again.'}`;
                case 'COOLDOWN_ACTIVE': 
                    return `⏳ This command is on cooldown. Please wait ${error.timeLeft || 'a moment'} seconds.`;
                case 'INSUFFICIENT_BALANCE': 
                    return '❌ You don\'t have enough coins for this action.';
                case 'INVENTORY_FULL': 
                    return '❌ Your inventory is full.';
                case 'ITEM_NOT_FOUND': 
                    return '❌ The requested item was not found.';
                case 'PROFILE_NOT_FOUND': 
                    return '❌ Please create a profile first using /profile create';
                case 'USER_NOT_FOUND':
                    return '❌ User not found or not accessible.';
                case 'CHANNEL_NOT_FOUND':
                    return '❌ Channel not found or not accessible.';
                case 'GUILD_NOT_FOUND':
                    return '❌ Server not found or not accessible.';
                case 'RATE_LIMITED':
                    return '⏳ Rate limited. Please slow down your requests.';
                case 'MAINTENANCE_MODE':
                    return '🔧 The bot is currently under maintenance. Please try again later.';
                case 'FEATURE_DISABLED':
                    return '❌ This feature is currently disabled.';
                default: 
                    return error.message || 'An unexpected error occurred.';
            }
        }

        // Handle common JavaScript errors
        if (error instanceof TypeError) {
            return 'A type error occurred. Please check your input.';
        }
        if (error instanceof ReferenceError) {
            return 'A reference error occurred. Please try again.';
        }
        if (error instanceof SyntaxError) {
            return 'Invalid syntax in the provided input.';
        }

        // Default fallback
        return error.message || 'An unexpected error occurred.';
    }

    static async handleCommandError(interaction, error, commandName) {
        // Enhanced error logging
        this.logError(error, `Command: ${commandName} | User: ${interaction.user?.tag} | Guild: ${interaction.guild?.name}`);
        
        const errorMessage = this.getErrorMessage(error);
        
        // Create more informative embed
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Command Error')
            .setDescription(errorMessage)
            .addFields(
                { name: 'Command', value: `\`${commandName}\``, inline: true },
                { name: 'Error Type', value: error.type || error.name || 'Unknown', inline: true },
                { name: 'Error Code', value: error.code ? `${error.code}` : 'N/A', inline: true }
            )
            .setFooter({ text: 'Try again later or contact support if the issue persists' })
            .setTimestamp();

        try {
            // Check if interaction is valid and not expired
            if (!interaction || !interaction.isRepliable()) {
                console.error('Invalid interaction object or interaction not repliable');
                return;
            }

            // Handle different interaction states
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (followupError) {
            console.error('Failed to send error message:', followupError);
            
            // Try alternative error notification
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ An error occurred and I couldn\'t send the detailed error message.', 
                        ephemeral: true 
                    });
                }
            } catch (finalError) {
                console.error('All error response methods failed:', finalError);
            }
        }
    }

    static async handleInteractionError(interaction, error) {
        this.logError(error, `Interaction Error | User: ${interaction?.user?.tag} | Type: ${interaction?.type}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('⚠️ Interaction Error')
            .setDescription('Something went wrong while processing your interaction.')
            .addFields(
                { name: 'What happened?', value: 'The bot encountered an unexpected error', inline: false },
                { name: 'What can you do?', value: '• Try using the command again\n• Wait a moment and retry\n• Check if the bot has proper permissions', inline: false },
                { name: 'Still having issues?', value: 'Contact server administrators for assistance', inline: false }
            )
            .setFooter({ text: 'If this persists, please report it' })
            .setTimestamp();

        try {
            if (!interaction || !interaction.isRepliable()) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (followupError) {
            console.error('Failed to send interaction error message:', followupError);
        }
    }

    static async handleDatabaseError(interaction, error, operation = 'database operation') {
        this.logError(error, `Database Error | Operation: ${operation} | User: ${interaction?.user?.tag}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🗄️ Database Error')
            .setDescription('There was an issue accessing the database.')
            .addFields(
                { name: 'Operation', value: operation, inline: true },
                { name: 'Status', value: 'Temporary issue', inline: true },
                { name: 'Your Data', value: 'Your data is safe and unchanged', inline: true },
                { name: 'Resolution', value: 'Please try again in a few moments. If the issue persists, contact support.', inline: false }
            )
            .setFooter({ text: 'Database errors are automatically logged and monitored' })
            .setTimestamp();

        try {
            if (!interaction || !interaction.isRepliable()) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (followupError) {
            console.error('Failed to send database error message:', followupError);
        }
    }

    static async handleCooldownError(interaction, timeLeft, commandName) {
        const timeLeftSeconds = Math.ceil(timeLeft / 1000);
        const timeString = timeLeftSeconds > 60 
            ? `${Math.ceil(timeLeftSeconds / 60)} minute(s)` 
            : `${timeLeftSeconds} second(s)`;

        const errorEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('⏱️ Command Cooldown')
            .setDescription(`You're using commands too quickly!`)
            .addFields(
                { name: 'Command', value: `\`${commandName}\``, inline: true },
                { name: 'Time Remaining', value: timeString, inline: true },
                { name: 'Cooldown Reason', value: 'Prevents spam and ensures fair usage', inline: true },
                { name: 'Tip', value: 'Use this time to plan your next move!', inline: false }
            )
            .setFooter({ text: 'Patience is a treasure hunter\'s virtue!' })
            .setTimestamp();

        try {
            if (!interaction || !interaction.isRepliable()) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to send cooldown error message:', error);
        }
    }

    static async handlePermissionError(interaction, requiredPermission) {
        const userRoleName = interaction.member?.roles?.highest?.name || 'No roles';
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🔒 Permission Error')
            .setDescription('You don\'t have permission to use this command.')
            .addFields(
                { name: 'Required Permission', value: requiredPermission || 'Unknown', inline: true },
                { name: 'Your Highest Role', value: userRoleName, inline: true },
                { name: 'Server', value: interaction.guild?.name || 'Unknown', inline: true },
                { name: 'Solution', value: 'Contact a server administrator to request access to this command.', inline: false },
                { name: 'Why permissions?', value: 'Permissions help maintain server organization and security.', inline: false }
            )
            .setFooter({ text: 'Permissions help keep the server organized and secure' })
            .setTimestamp();

        try {
            if (!interaction || !interaction.isRepliable()) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to send permission error message:', error);
        }
    }

    static logError(error, context = 'Unknown') {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            context,
            name: error?.name || 'Unknown Error',
            message: error?.message || 'No message',
            code: error?.code || null,
            type: error?.type || null,
            stack: error?.stack || 'No stack trace available'
        };

        console.error(`[${timestamp}] Error in ${context}:`, errorInfo);

        // You can extend this to log to external services
        // Example: Send to logging service, database, or file
        // await this.sendToLoggingService(errorInfo);
    }

    static createCustomError(type, message, additionalData = {}) {
        const error = new Error(message);
        error.type = type;
        Object.assign(error, additionalData);
        return error;
    }

    static async handleRateLimitError(interaction, retryAfter) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF9500')
            .setTitle('⏳ Rate Limited')
            .setDescription('The bot is being rate limited by Discord.')
            .addFields(
                { name: 'Retry After', value: `${Math.ceil(retryAfter / 1000)} seconds`, inline: true },
                { name: 'Reason', value: 'Too many requests sent to Discord', inline: true },
                { name: 'What to do', value: 'Please wait and try again automatically', inline: false }
            )
            .setFooter({ text: 'This is a temporary Discord limitation' })
            .setTimestamp();

        try {
            if (!interaction || !interaction.isRepliable()) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to send rate limit error message:', error);
        }
    }
}

// Utility functions for direct use
async function handleError(interaction, error) {
    return ErrorHandler.handleInteractionError(interaction, error);
}

// Enhanced error handling wrapper for commands
function wrapCommandHandler(handler) {
    return async (interaction) => {
        try {
            await handler(interaction);
        } catch (error) {
            await ErrorHandler.handleCommandError(interaction, error, interaction.commandName);
        }
    };
}

// Enhanced error handling wrapper for events
function wrapEventHandler(handler, eventName) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            ErrorHandler.logError(error, `Event: ${eventName}`);
        }
    };
}

module.exports = {
    ErrorHandler,
    handleError,
    wrapCommandHandler,
    wrapEventHandler,
    handleCommandError: ErrorHandler.handleCommandError.bind(ErrorHandler),
    handleInteractionError: ErrorHandler.handleInteractionError.bind(ErrorHandler),
    handleDatabaseError: ErrorHandler.handleDatabaseError.bind(ErrorHandler),
    handleCooldownError: ErrorHandler.handleCooldownError.bind(ErrorHandler),
    handlePermissionError: ErrorHandler.handlePermissionError.bind(ErrorHandler),
    handleRateLimitError: ErrorHandler.handleRateLimitError.bind(ErrorHandler),
    logError: ErrorHandler.logError.bind(ErrorHandler),
    createCustomError: ErrorHandler.createCustomError.bind(ErrorHandler)
};