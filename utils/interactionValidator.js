
/**
 * Enhanced Interaction Validation Utilities
 * Provides comprehensive validation and error handling for Discord interactions
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.js');

module.exports = {
    /**
     * Validate button interaction with enhanced checks
     * @param {Object} interaction - Discord button interaction
     * @returns {Object} - Validation result with details
     */
    validateButtonInteraction(interaction) {
        const result = {
            valid: false,
            errors: [],
            warnings: []
        };

        try {
            // Check if interaction exists
            if (!interaction) {
                result.errors.push('No interaction provided');
                return result;
            }

            // Check if it's a button interaction
            if (!interaction.isButton || !interaction.isButton()) {
                result.errors.push('Invalid interaction type for button handler');
                return result;
            }

            // Check for customId
            if (!interaction.customId) {
                result.errors.push('Button interaction missing customId');
                return result;
            }

            // Check for user information
            if (!interaction.user || !interaction.user.id) {
                result.errors.push('Button interaction missing user information');
                return result;
            }

            // Check if interaction is valid (not expired)
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            if (now - interactionTime > 15 * 60 * 1000) { // 15 minutes
                result.errors.push('Button interaction expired');
                return result;
            }

            // Check if interaction can be replied to
            if (!interaction.isRepliable()) {
                result.warnings.push('Interaction may not be repliable');
            }

            result.valid = true;
            return result;

        } catch (error) {
            console.error('Error validating button interaction:', error);
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    },

    /**
     * Validate select menu interaction with enhanced checks
     * @param {Object} interaction - Discord select menu interaction
     * @returns {Object} - Validation result with details
     */
    validateSelectMenuInteraction(interaction) {
        const result = {
            valid: false,
            errors: [],
            warnings: []
        };

        try {
            // Check if interaction exists
            if (!interaction) {
                result.errors.push('No interaction provided');
                return result;
            }

            // Check if it's a select menu interaction
            if (!interaction.isStringSelectMenu || !interaction.isStringSelectMenu()) {
                result.errors.push('Invalid interaction type for select menu handler');
                return result;
            }

            // Check for values
            if (!interaction.values || !Array.isArray(interaction.values) || !interaction.values[0]) {
                result.errors.push('Select menu interaction missing or invalid values');
                return result;
            }

            // Check for user information
            if (!interaction.user || !interaction.user.id) {
                result.errors.push('Select menu interaction missing user information');
                return result;
            }

            // Check if interaction is valid (not expired)
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            if (now - interactionTime > 15 * 60 * 1000) { // 15 minutes
                result.errors.push('Select menu interaction expired');
                return result;
            }

            // Check if interaction can be replied to
            if (!interaction.isRepliable()) {
                result.warnings.push('Interaction may not be repliable');
            }

            result.valid = true;
            return result;

        } catch (error) {
            console.error('Error validating select menu interaction:', error);
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    },

    /**
     * Validate any interaction with comprehensive checks
     * @param {Object} interaction - Discord interaction
     * @returns {Object} - Validation result with details
     */
    validateInteraction(interaction) {
        const result = {
            valid: false,
            errors: [],
            warnings: []
        };

        try {
            if (!interaction) {
                result.errors.push('No interaction provided');
                return result;
            }

            if (!interaction.user || !interaction.user.id) {
                result.errors.push('Interaction missing user information');
                return result;
            }

            if (!interaction.guild && !interaction.channel) {
                result.errors.push('Interaction missing guild or channel information');
                return result;
            }

            // Check if interaction is expired
            const now = Date.now();
            const interactionTime = interaction.createdTimestamp || now;
            if (now - interactionTime > 15 * 60 * 1000) {
                result.errors.push('Interaction has expired');
                return result;
            }

            // Check if interaction can be replied to
            if (!interaction.isRepliable()) {
                result.warnings.push('Interaction may not be repliable');
            }

            result.valid = true;
            return result;

        } catch (error) {
            console.error('Error validating interaction:', error);
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    },

    /**
     * Handle interaction timeout with multiple fallback methods
     * @param {Object} interaction - Discord interaction
     */
    async handleInteractionTimeout(interaction) {
        if (!interaction) {
            console.error('Cannot handle timeout: No interaction provided');
            return;
        }

        try {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(config?.embedColors?.warning || '#FFA500')
                .setTitle('⏰ Interaction Timeout')
                .setDescription('This interaction has timed out. Please try the command again.')
                .setTimestamp();

            const timeoutOptions = {
                embeds: [timeoutEmbed],
                components: []
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(timeoutOptions);
            } else {
                timeoutOptions.flags = MessageFlags.Ephemeral;
                await interaction.reply(timeoutOptions);
            }
        } catch (error) {
            console.error('Error handling interaction timeout:', error);
            
            // Try simple text fallback
            try {
                const simpleMessage = '⏰ This interaction has timed out. Please try again.';
                
                if (interaction.channel) {
                    await interaction.channel.send(simpleMessage);
                }
            } catch (channelError) {
                console.error('Channel fallback for timeout also failed:', channelError);
            }
        }
    },

    /**
     * Handle interaction error with comprehensive error response
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
                { name: 'Error Type', value: error?.name || 'Unknown', inline: true },
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
     * Check if user has required permissions with detailed validation
     * @param {Object} interaction - Discord interaction
     * @param {Array} requiredPermissions - Required permission strings
     * @returns {Object} - Permission check result
     */
    checkUserPermissions(interaction, requiredPermissions = []) {
        const result = {
            hasPermissions: false,
            missingPermissions: [],
            errors: []
        };

        try {
            // Early returns for basic validation
            if (!interaction) {
                result.errors.push('No interaction provided');
                return result;
            }

            if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
                result.hasPermissions = true;
                return result; // No permissions required
            }

            // Check if it's a DM (no member object in DMs)
            if (!interaction.guild) {
                result.hasPermissions = true;
                return result; // Allow in DMs by default
            }

            if (!interaction.member) {
                result.errors.push('No member object found for permission check');
                return result;
            }

            if (!interaction.member.permissions) {
                result.errors.push('No permissions object found on member');
                return result;
            }

            // Check if user has all required permissions
            for (const permission of requiredPermissions) {
                try {
                    if (!interaction.member.permissions.has(permission)) {
                        result.missingPermissions.push(permission);
                    }
                } catch (permError) {
                    console.error(`Error checking permission ${permission}:`, permError);
                    result.errors.push(`Error checking permission: ${permission}`);
                }
            }

            result.hasPermissions = result.missingPermissions.length === 0;
            return result;

        } catch (error) {
            console.error('Error checking user permissions:', error);
            result.errors.push(`Permission check error: ${error.message}`);
            return result;
        }
    },

    /**
     * Safe interaction response with comprehensive error handling
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
            // Check interaction state and respond accordingly
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(options);
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply(options);
            } else {
                // Use followUp for already replied interactions
                const followUpOptions = { ...options };
                followUpOptions.flags = MessageFlags.Ephemeral;
                return await interaction.followUp(followUpOptions);
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
    },

    /**
     * Create safe embed fields with validation
     * @param {String} name - Field name
     * @param {String} value - Field value
     * @param {Boolean} inline - Whether field is inline
     * @returns {Object} - Safe embed field
     */
    createSafeEmbedField(name, value, inline = false) {
        return {
            name: String(name || 'Unknown').substring(0, 256),
            value: String(value || 'N/A').substring(0, 1024),
            inline: Boolean(inline)
        };
    }
};
