/**
 * Interaction Fixing Utilities
 * Provides robust fixes for all Discord interaction issues
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.js');

module.exports = {
    /**
     * Create a safe interaction wrapper that prevents errors
     * @param {Object} interaction - Original Discord interaction
     * @returns {Object} - Enhanced interaction with error handling
     */
    createSafeInteraction(interaction) {
        if (!interaction) {
            throw new Error('No interaction provided to createSafeInteraction');
        }

        // Store original methods to prevent infinite recursion
        const originalReply = interaction.reply.bind(interaction);
        const originalFollowUp = interaction.followUp.bind(interaction);
        const originalEditReply = interaction.editReply.bind(interaction);

        const safeInteraction = {
            ...interaction,
            
            // Safe reply method
            reply: async (options) => {
                if (!options) {
                    console.error('No options provided to safe reply');
                    return null;
                }

                try {
                    // Check interaction state before attempting reply
                    if (interaction.replied || interaction.deferred) {
                        console.warn('Interaction already replied/deferred, using editReply instead');
                        return await originalEditReply(options);
                    }
                    return await originalReply(options);
                } catch (error) {
                    console.error('Safe reply error:', error);
                    
                    // Fallback to channel send
                    try {
                        if (interaction.channel) {
                            const channelOptions = this.prepareChannelOptions(options);
                            return await interaction.channel.send(channelOptions);
                        }
                    } catch (fallbackError) {
                        console.error('Fallback reply failed:', fallbackError);
                        throw fallbackError;
                    }
                }
            },

            // Safe followUp method
            followUp: async (options) => {
                if (!options) {
                    console.error('No options provided to safe followUp');
                    return null;
                }

                try {
                    return await originalFollowUp(options);
                } catch (error) {
                    console.error('Safe followUp error:', error);
                    
                    // Fallback to channel send
                    try {
                        if (interaction.channel) {
                            const channelOptions = this.prepareChannelOptions(options);
                            return await interaction.channel.send(channelOptions);
                        }
                    } catch (fallbackError) {
                        console.error('FollowUp fallback failed:', fallbackError);
                        throw fallbackError;
                    }
                }
            },

            // Safe editReply method
            editReply: async (options) => {
                if (!options) {
                    console.error('No options provided to safe editReply');
                    return null;
                }

                try {
                    return await originalEditReply(options);
                } catch (error) {
                    console.error('Safe editReply error:', error);
                    
                    // Fallback to channel send
                    try {
                        if (interaction.channel) {
                            const channelOptions = this.prepareChannelOptions(options);
                            return await interaction.channel.send(channelOptions);
                        }
                    } catch (fallbackError) {
                        console.error('EditReply fallback failed:', fallbackError);
                        throw fallbackError;
                    }
                }
            }
        };

        return safeInteraction;
    },

    /**
     * Prepare options for channel send (remove interaction-specific flags)
     * @param {Object|String} options - Original options
     * @returns {Object} - Channel-safe options
     */
    prepareChannelOptions(options) {
        if (typeof options === 'string') {
            return { content: options };
        }

        const channelOptions = { ...options };
        
        // Remove interaction-specific properties
        delete channelOptions.flags;
        delete channelOptions.ephemeral;
        
        // Ensure content exists if no embeds
        if (!channelOptions.content && !channelOptions.embeds?.length) {
            channelOptions.content = 'Command executed successfully!';
        }

        return channelOptions;
    },

    /**
     * Fix button interaction issues
     * @param {Object} interaction - Button interaction
     * @param {Function} handler - Handler function to execute
     */
    async fixButtonInteraction(interaction, handler) {
        if (!interaction) {
            console.error('Button interaction fix error: No interaction provided');
            return;
        }

        if (!handler || typeof handler !== 'function') {
            console.error('Button interaction fix error: No valid handler provided');
            return;
        }

        try {
            // Validate button interaction
            if (!interaction.isButton || !interaction.isButton()) {
                throw new Error('Invalid button interaction type');
            }

            if (!interaction.customId) {
                throw new Error('Missing customId in button interaction');
            }

            if (!interaction.user?.id) {
                throw new Error('Missing user information in button interaction');
            }

            const safeInteraction = this.createSafeInteraction(interaction);
            return await handler(safeInteraction);
        } catch (error) {
            console.error('Button interaction fix error:', error);
            
            await this.sendErrorResponse(interaction, 'Button Error', 'This button interaction encountered an error. Please try again.');
        }
    },

    /**
     * Fix select menu interaction issues
     * @param {Object} interaction - Select menu interaction
     * @param {Function} handler - Handler function to execute
     */
    async fixSelectMenuInteraction(interaction, handler) {
        if (!interaction) {
            console.error('Select menu interaction fix error: No interaction provided');
            return;
        }

        if (!handler || typeof handler !== 'function') {
            console.error('Select menu interaction fix error: No valid handler provided');
            return;
        }

        try {
            // Validate select menu interaction
            if (!interaction.isStringSelectMenu || !interaction.isStringSelectMenu()) {
                throw new Error('Invalid select menu interaction type');
            }

            if (!interaction.values || !Array.isArray(interaction.values) || !interaction.values[0]) {
                throw new Error('Missing or invalid values in select menu interaction');
            }

            if (!interaction.user?.id) {
                throw new Error('Missing user information in select menu interaction');
            }

            const safeInteraction = this.createSafeInteraction(interaction);
            return await handler(safeInteraction);
        } catch (error) {
            console.error('Select menu interaction fix error:', error);
            
            await this.sendErrorResponse(interaction, 'Menu Error', 'This menu selection encountered an error. Please try again.');
        }
    },

    /**
     * Send error response with multiple fallback methods
     * @param {Object} interaction - Discord interaction
     * @param {String} title - Error title
     * @param {String} description - Error description
     */
    async sendErrorResponse(interaction, title, description) {
        const errorColor = config?.embedColors?.error || '#FF0000';
        
        const embed = new EmbedBuilder()
            .setColor(errorColor)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        const errorOptions = {
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        };

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorOptions);
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.followUp(errorOptions);
            }
        } catch (replyError) {
            console.error('Failed to send error response:', replyError);
            
            // Channel fallback
            try {
                if (interaction.channel) {
                    await interaction.channel.send({ embeds: [embed] });
                }
            } catch (channelError) {
                console.error('Channel error response fallback failed:', channelError);
                
                // Final text fallback
                try {
                    if (interaction.channel) {
                        await interaction.channel.send(`❌ ${title}: ${description}`);
                    }
                } catch (finalError) {
                    console.error('All error response methods failed:', finalError);
                }
            }
        }
    },

    /**
     * Create enhanced fake interaction for prefix commands
     * @param {Object} message - Discord message object
     * @param {Object} client - Discord client
     * @param {String} commandName - Command name
     * @returns {Object} - Enhanced fake interaction
     */
    createPrefixInteraction(message, client, commandName) {
        if (!message) {
            throw new Error('No message provided to createPrefixInteraction');
        }

        if (!client) {
            throw new Error('No client provided to createPrefixInteraction');
        }

        const safeCommandName = String(commandName || 'unknown');

        // Create the fake interaction object
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            client: client,
            commandName: safeCommandName,
            createdTimestamp: message.createdTimestamp,
            deferred: false,
            replied: false,
            customId: null,
            values: null,
            _deferredMessage: null,
            
            // Interaction type checkers
            isButton: () => false,
            isChatInputCommand: () => true, // Simulate as chat command
            isStringSelectMenu: () => false,
            isCommand: () => true,
            
            // Options object with safe getters
            options: {
                getString: (name) => {
                    // Could parse from message content if needed
                    return null;
                },
                getInteger: (name) => {
                    // Could parse from message content if needed
                    return null;
                },
                getNumber: (name) => {
                    // Could parse from message content if needed
                    return null;
                },
                getBoolean: (name) => {
                    // Could parse from message content if needed
                    return null;
                },
                getUser: (name) => {
                    // Could parse mentions if needed
                    return null;
                },
                getChannel: (name) => {
                    // Could parse channel mentions if needed
                    return null;
                },
                getRole: (name) => {
                    // Could parse role mentions if needed
                    return null;
                },
                getAttachment: (name) => {
                    // Could check message attachments if needed
                    return message.attachments?.first() || null;
                }
            }
        };

        // Add methods to the fake interaction object
        fakeInteraction.reply = async (options) => {
            if (!options) {
                console.error('No options provided to prefix reply');
                return null;
            }

            try {
                if (typeof options === 'string') {
                    const result = await message.reply(options);
                    fakeInteraction.replied = true;
                    return result;
                }
                
                // Remove interaction-specific flags for message replies
                const messageOptions = { ...options };
                delete messageOptions.flags;
                delete messageOptions.ephemeral;
                
                const result = await message.reply(messageOptions);
                fakeInteraction.replied = true;
                return result;
            } catch (error) {
                console.error('Prefix reply error:', error);
                
                try {
                    const result = await message.channel.send({ 
                        content: 'Command executed successfully!' 
                    });
                    fakeInteraction.replied = true;
                    return result;
                } catch (fallbackError) {
                    console.error('Prefix reply fallback failed:', fallbackError);
                    throw fallbackError;
                }
            }
        };
        
        fakeInteraction.followUp = async (options) => {
            if (!options) {
                console.error('No options provided to prefix followUp');
                return null;
            }

            try {
                if (typeof options === 'string') {
                    return await message.channel.send(options);
                }
                
                // Remove interaction-specific flags
                const channelOptions = { ...options };
                delete channelOptions.flags;
                delete channelOptions.ephemeral;
                
                return await message.channel.send(channelOptions);
            } catch (error) {
                console.error('Prefix followUp error:', error);
                throw error;
            }
        };
        
        fakeInteraction.editReply = async (options) => {
            // For prefix commands, editReply becomes a new message via followUp
            return await fakeInteraction.followUp(options);
        };
        
        fakeInteraction.deferReply = async (options = {}) => {
            // For prefix commands, we can send a "thinking" message
            try {
                if (options.ephemeral) {
                    // Can't do ephemeral in prefix commands
                    fakeInteraction.deferred = true;
                    return Promise.resolve();
                }
                
                const thinkingMsg = await message.channel.send('🤔 Processing...');
                
                // Store reference for potential editing
                fakeInteraction._deferredMessage = thinkingMsg;
                fakeInteraction.deferred = true;
                
                return thinkingMsg;
            } catch (error) {
                console.error('Prefix deferReply error:', error);
                fakeInteraction.deferred = true; // Mark as deferred even if message failed
                return Promise.resolve();
            }
        };

        return fakeInteraction;
    },

    /**
     * Validate and fix any interaction type
     * @param {Object} interaction - Any Discord interaction
     * @param {Function} handler - Handler function
     */
    async fixAnyInteraction(interaction, handler) {
        if (!interaction) {
            console.error('Fix any interaction error: No interaction provided');
            return;
        }

        if (!handler || typeof handler !== 'function') {
            console.error('Fix any interaction error: No valid handler provided');
            return;
        }

        try {
            // Determine interaction type and use appropriate fixer
            if (interaction.isButton && interaction.isButton()) {
                return await this.fixButtonInteraction(interaction, handler);
            } else if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                return await this.fixSelectMenuInteraction(interaction, handler);
            } else if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
                // For slash commands, just use safe interaction wrapper
                const safeInteraction = this.createSafeInteraction(interaction);
                return await handler(safeInteraction);
            } else {
                // Generic safe wrapper for other interaction types
                const safeInteraction = this.createSafeInteraction(interaction);
                return await handler(safeInteraction);
            }
        } catch (error) {
            console.error('Fix any interaction error:', error);
            await this.sendErrorResponse(interaction, 'Interaction Error', 'This interaction encountered an error. Please try again.');
        }
    }
};