/**
 * Interaction Validation Utilities
 * Provides validation and error handling for Discord interactions
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.js');

module.exports = {
    /**
     * Validate button interaction
     * @param {Object} interaction - Discord button interaction
     * @returns {Boolean} - Whether interaction is valid
     */
    validateButtonInteraction(interaction) {
        try {
            // Check if interaction exists
            if (!interaction) {
                console.warn('Button interaction validation failed: No interaction provided');
                return false;
            }

            // Check if it's a button interaction
            if (!interaction.isButton || !interaction.isButton()) {
                console.warn('Invalid interaction type for button handler');
                return false;
            }

            // Check for customId
            if (!interaction.customId) {
                console.warn('Button interaction missing customId');
                return false;
            }

            // Check for user information
            if (!interaction.user || !interaction.user.id) {
                console.warn('Button interaction missing user information');
                return false;
            }

            // Check if interaction is valid (not expired)
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            if (now - interactionTime > 15 * 60 * 1000) { // 15 minutes
                console.warn('Button interaction expired');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating button interaction:', error);
            return false;
        }
    },

    /**
     * Validate select menu interaction
     * @param {Object} interaction - Discord select menu interaction
     * @returns {Boolean} - Whether interaction is valid
     */
    validateSelectMenuInteraction(interaction) {
        try {
            // Check if interaction exists
            if (!interaction) {
                console.warn('Select menu interaction validation failed: No interaction provided');
                return false;
            }

            // Check if it's a select menu interaction
            if (!interaction.isStringSelectMenu || !interaction.isStringSelectMenu()) {
                console.warn('Invalid interaction type for select menu handler');
                return false;
            }

            // Check for values
            if (!interaction.values || !Array.isArray(interaction.values) || !interaction.values[0]) {
                console.warn('Select menu interaction missing values');
                return false;
            }

            // Check for user information
            if (!interaction.user || !interaction.user.id) {
                console.warn('Select menu interaction missing user information');
                return false;
            }

            // Check if interaction is valid (not expired)
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            if (now - interactionTime > 15 * 60 * 1000) { // 15 minutes
                console.warn('Select menu interaction expired');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating select menu interaction:', error);
            return false;
        }
    },

    /**
     * Validate any interaction
     * @param {Object} interaction - Discord interaction
     * @returns {Boolean} - Whether interaction is valid
     */
    validateInteraction(interaction) {
        try {
            if (!interaction) {
                console.warn('Interaction validation failed: No interaction provided');
                return false;
            }

            if (!interaction.user || !interaction.user.id) {
                console.warn('Interaction missing user information');
                return false;
            }

            if (!interaction.guild && !interaction.channel) {
                console.warn('Interaction missing guild or channel information');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating interaction:', error);
            return false;
        }
    },

    /**
     * Handle interaction timeout
     * @param {Object} interaction - Discord interaction
     */
    async handleInteractionTimeout(interaction) {
        if (!interaction) {
            console.error('Cannot handle timeout: No interaction provided');
            return;
        }

        try {
            const timeoutMessage = {
                content: '⏰ This interaction has timed out. Please try the command again.',
                components: []
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(timeoutMessage);
            } else {
                timeoutMessage.flags = MessageFlags.Ephemeral;
                await interaction.reply(timeoutMessage);
            }
        } catch (error) {
            console.error('Error handling interaction timeout:', error);
            
            // Try channel fallback
            try {
                if (interaction.channel) {
                    await interaction.channel.send('⏰ Interaction timed out. Please try again.');
                }
            } catch (channelError) {
                console.error('Channel fallback for timeout also failed:', channelError);
            }
        }
    },

    /**
     * Handle interaction error with user-friendly message
     * @param {Object} interaction - Discord interaction
     * @param {Error} error - Error object
     * @param {String} context - Error context for logging
     */
    async handleInteractionError(interaction, error, context = 'Unknown') {
        if (!interaction) {
            console.error(`Interaction error in ${context}: No interaction provided`, error);
            return;
        }

        console.error(`Interaction error in ${context}:`, error);

        const errorColor = config?.embedColors?.error || '#FF0000';
        const safeContext = String(context).substring(0, 1024);

        const embed = new EmbedBuilder()
            .setColor(errorColor)
            .setTitle('⚠️ Interaction Error')
            .setDescription('An error occurred while processing your interaction. Please try again.')
            .addFields([
                { name: 'Context', value: safeContext, inline: true },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            ])
            .setFooter({ text: 'If this error persists, please contact support.' });

        try {
            const errorResponse = { embeds: [embed], components: [] };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(errorResponse);
            } else {
                errorResponse.flags = MessageFlags.Ephemeral;
                await interaction.reply(errorResponse);
            }
        } catch (replyError) {
            console.error('Failed to send error response:', replyError);
            
            // Try channel fallback
            try {
                if (interaction.channel) {
                    await interaction.channel.send({ 
                        embeds: [embed]
                    });
                }
            } catch (channelError) {
                console.error('Channel fallback for error response also failed:', channelError);
            }
        }
    },

    /**
     * Check if user has required permissions
     * @param {Object} interaction - Discord interaction
     * @param {Array} requiredPermissions - Required permission strings
     * @returns {Boolean} - Whether user has permissions
     */
    checkUserPermissions(interaction, requiredPermissions = []) {
        try {
            // Early returns for basic validation
            if (!interaction) {
                console.warn('Cannot check permissions: No interaction provided');
                return false;
            }

            if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
                return true; // No permissions required
            }

            // Check if it's a DM (no member object in DMs)
            if (!interaction.guild) {
                console.warn('Cannot check permissions in DM');
                return true; // Allow in DMs by default
            }

            if (!interaction.member) {
                console.warn('No member object found for permission check');
                return false;
            }

            if (!interaction.member.permissions) {
                console.warn('No permissions object found on member');
                return false;
            }

            // Check if user has all required permissions
            return requiredPermissions.every(permission => {
                try {
                    return interaction.member.permissions.has(permission);
                } catch (permError) {
                    console.error(`Error checking permission ${permission}:`, permError);
                    return false;
                }
            });
        } catch (error) {
            console.error('Error checking user permissions:', error);
            return false;
        }
    },

    /**
     * Create a safe interaction response for debugging
     * @param {Object} interaction - Discord interaction
     * @param {String} message - Debug message
     */
    async debugResponse(interaction, message) {
        if (!interaction) {
            console.error('Cannot send debug response: No interaction provided');
            return;
        }

        try {
            const safeMessage = String(message || 'No debug message provided').substring(0, 4096);

            const debugEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔍 Debug Information')
                .setDescription(safeMessage)
                .setTimestamp();

            const debugResponse = { embeds: [debugEmbed] };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(debugResponse);
            } else {
                debugResponse.flags = MessageFlags.Ephemeral;
                await interaction.reply(debugResponse);
            }
        } catch (error) {
            console.error('Debug response failed:', error);
            
            // Simple fallback
            try {
                const fallbackMessage = `🔍 Debug: ${String(message).substring(0, 100)}`;
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: fallbackMessage });
                } else {
                    await interaction.reply({ 
                        content: fallbackMessage, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (fallbackError) {
                console.error('Debug fallback also failed:', fallbackError);
            }
        }
    },

    /**
     * Safe wrapper for interaction responses
     * @param {Object} interaction - Discord interaction
     * @param {Object} options - Response options
     * @returns {Promise} - Response promise
     */
    async safeInteractionReply(interaction, options) {
        if (!interaction) {
            throw new Error('No interaction provided to safeInteractionReply');
        }

        if (!options) {
            throw new Error('No options provided to safeInteractionReply');
        }

        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(options);
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply(options);
            } else {
                return await interaction.followUp(options);
            }
        } catch (error) {
            console.error('Safe interaction reply failed:', error);
            
            // Try channel fallback
            if (interaction.channel) {
                const channelOptions = { ...options };
                delete channelOptions.flags; // Remove ephemeral flag for channel sends
                return await interaction.channel.send(channelOptions);
            }
            
            throw error;
        }
    },

    /**
     * Check if interaction is still valid (not expired)
     * @param {Object} interaction - Discord interaction
     * @returns {Boolean} - Whether interaction is still valid
     */
    isInteractionValid(interaction) {
        if (!interaction) return false;

        try {
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            const maxAge = 15 * 60 * 1000; // 15 minutes

            return (now - interactionTime) <= maxAge;
        } catch (error) {
            console.error('Error checking interaction validity:', error);
            return false;
        }
    },

    /**
     * Get safe user display name from interaction
     * @param {Object} interaction - Discord interaction
     * @returns {String} - Safe display name
     */
    getSafeUserDisplayName(interaction) {
        try {
            if (!interaction || !interaction.user) {
                return 'Unknown User';
            }

            const displayName = interaction.member?.displayName || 
                              interaction.user.globalName || 
                              interaction.user.username || 
                              'Unknown User';

            return String(displayName).substring(0, 100);
        } catch (error) {
            console.error('Error getting user display name:', error);
            return 'Unknown User';
        }
    }
};