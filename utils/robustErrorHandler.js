/**
 * Robust Error Handler for Discord Bot
 * Handles all types of interaction errors with fallbacks
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

class RobustErrorHandler {
    static async handleInteractionError(interaction, error, context = 'Unknown') {
        if (!interaction) {
            console.error(`[${context}] Interaction Error: No interaction provided`, error);
            return;
        }

        console.error(`[${context}] Interaction Error:`, error);

        // Create error embed with better error handling
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⚠️ Interaction Error')
            .setDescription('An error occurred while processing your request.')
            .addFields([
                { 
                    name: 'Context', 
                    value: String(context).substring(0, 1024) || 'Unknown', 
                    inline: true 
                },
                { 
                    name: 'Time', 
                    value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
                    inline: true 
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'Please try again. If the issue persists, contact support.' });

        // Try multiple response methods with fallbacks
        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    embeds: [errorEmbed], 
                    flags: MessageFlags.Ephemeral
                });
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                return await interaction.followUp({ 
                    embeds: [errorEmbed], 
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            console.error('Primary error response failed:', replyError);
            
            // Fallback to channel send
            try {
                if (interaction.channel) {
                    return await interaction.channel.send({ embeds: [errorEmbed] });
                }
            } catch (channelError) {
                console.error('Channel fallback failed:', channelError);
                
                // Final fallback - simple message
                try {
                    if (interaction.channel) {
                        return await interaction.channel.send('❌ An error occurred. Please try again.');
                    }
                } catch (finalError) {
                    console.error('All error response methods failed:', finalError);
                }
            }
        }
    }

    static async handleCommandError(interaction, error, commandName) {
        if (!interaction) {
            console.error(`Command Error [${commandName}]: No interaction provided`, error);
            return;
        }

        console.error(`Command Error [${commandName}]:`, error);

        const safeCommandName = String(commandName || 'unknown').substring(0, 100);
        const errorName = error?.name || 'Unknown Error';

        const errorEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔧 Command Error')
            .setDescription(`The \`${safeCommandName}\` command encountered an error.`)
            .addFields([
                { name: 'Command', value: `\`/${safeCommandName}\``, inline: true },
                { name: 'Error Type', value: errorName.substring(0, 1024), inline: true },
                { name: 'Suggestion', value: `Try using the command again or use prefix version: \`v!${safeCommandName}\``, inline: false }
            ])
            .setTimestamp()
            .setFooter({ text: 'RPG Treasure Hunter Bot Error Handler' });

        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ 
                    embeds: [errorEmbed], 
                    flags: MessageFlags.Ephemeral
                });
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                return await interaction.followUp({ 
                    embeds: [errorEmbed], 
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (replyError) {
            console.error('Command error response failed:', replyError);
            
            try {
                if (interaction.channel) {
                    return await interaction.channel.send({ embeds: [errorEmbed] });
                }
            } catch (channelError) {
                console.error('Command channel fallback failed:', channelError);
                
                // Final fallback
                try {
                    if (interaction.channel) {
                        return await interaction.channel.send(`❌ Command \`${safeCommandName}\` failed. Please try again.`);
                    }
                } catch (finalError) {
                    console.error('All command error response methods failed:', finalError);
                }
            }
        }
    }

    static async handleButtonError(interaction, error, buttonId) {
        if (!interaction) {
            console.error(`Button Error [${buttonId}]: No interaction provided`, error);
            return;
        }

        console.error(`Button Error [${buttonId}]:`, error);

        const safeButtonId = String(buttonId || 'unknown').substring(0, 100);

        try {
            const errorMessage = {
                content: `❌ Button interaction failed: \`${safeButtonId}\`. Please try again.`,
                flags: MessageFlags.Ephemeral
            };

            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(errorMessage);
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply(errorMessage);
            } else {
                return await interaction.followUp(errorMessage);
            }
        } catch (replyError) {
            console.error('Button error response failed:', replyError);
            
            // Fallback to channel send
            try {
                if (interaction.channel) {
                    return await interaction.channel.send(`❌ Button interaction failed: \`${safeButtonId}\`. Please try again.`);
                }
            } catch (channelError) {
                console.error('Button channel fallback failed:', channelError);
            }
        }
    }

    static async handleSelectMenuError(interaction, error, menuValue) {
        if (!interaction) {
            console.error(`Select Menu Error [${menuValue}]: No interaction provided`, error);
            return;
        }

        console.error(`Select Menu Error [${menuValue}]:`, error);

        const safeMenuValue = String(menuValue || 'unknown').substring(0, 100);

        try {
            const errorMessage = {
                content: `❌ Menu selection failed: \`${safeMenuValue}\`. Please try again.`,
                flags: MessageFlags.Ephemeral
            };

            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(errorMessage);
            } else if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply(errorMessage);
            } else {
                return await interaction.followUp(errorMessage);
            }
        } catch (replyError) {
            console.error('Select menu error response failed:', replyError);
            
            // Fallback to channel send
            try {
                if (interaction.channel) {
                    return await interaction.channel.send(`❌ Menu selection failed: \`${safeMenuValue}\`. Please try again.`);
                }
            } catch (channelError) {
                console.error('Select menu channel fallback failed:', channelError);
            }
        }
    }

    static logError(error, context = 'Unknown') {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            name: error?.name || 'Unknown Error',
            message: error?.message || 'No error message',
            stack: error?.stack || 'No stack trace',
            context: String(context)
        };
        
        console.error(`[${timestamp}] Error in ${context}:`, errorInfo);
    }

    static async safeReply(interaction, options) {
        if (!interaction) {
            throw new Error('No interaction provided to safeReply');
        }

        if (!options) {
            throw new Error('No options provided to safeReply');
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
            console.error('Safe reply failed:', error);
            
            try {
                if (interaction.channel) {
                    // Remove flags from options for channel send (channels don't support ephemeral)
                    const channelOptions = { ...options };
                    delete channelOptions.flags;
                    return await interaction.channel.send(channelOptions);
                } else {
                    throw new Error('No channel available for fallback');
                }
            } catch (channelError) {
                console.error('Channel send fallback failed:', channelError);
                throw channelError;
            }
        }
    }

    /**
     * Utility method to safely check interaction state
     */
    static getInteractionState(interaction) {
        if (!interaction) {
            return 'no_interaction';
        }

        try {
            if (interaction.replied) return 'replied';
            if (interaction.deferred) return 'deferred';
            return 'fresh';
        } catch (error) {
            console.error('Error checking interaction state:', error);
            return 'unknown';
        }
    }

    /**
     * Utility method to create safe embed fields
     */
    static createSafeEmbedField(name, value, inline = false) {
        return {
            name: String(name || 'Unknown').substring(0, 256),
            value: String(value || 'N/A').substring(0, 1024),
            inline: Boolean(inline)
        };
    }

    /**
     * Emergency error handler for critical failures
     */
    static emergencyLog(error, context = 'Critical Error') {
        try {
            const timestamp = new Date().toISOString();
            console.error(`[EMERGENCY] [${timestamp}] ${context}:`, {
                error: error?.toString() || 'Unknown error',
                stack: error?.stack || 'No stack trace'
            });
        } catch (logError) {
            // If even logging fails, try basic console.error
            console.error('CRITICAL: Emergency logging failed', logError);
            console.error('Original error:', error);
        }
    }
}

module.exports = RobustErrorHandler;