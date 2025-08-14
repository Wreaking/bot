const { EmbedBuilder } = require('discord.js');

class ErrorHandler {
    static async handleCommandError(error, message, command) {
        console.error(`Error executing command ${command?.name || 'unknown'}:`, error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('There was an error executing the command.');

        if (error.code) {
            switch (error.code) {
                case 'MISSING_PERMISSIONS':
                    errorEmbed.addFields({
                        name: 'Reason',
                        value: 'I don\'t have the required permissions to do that!'
                    });
                    break;
                case 'MISSING_ACCESS':
                    errorEmbed.addFields({
                        name: 'Reason',
                        value: 'I don\'t have access to perform that action!'
                    });
                    break;
                case 'DATABASE_ERROR':
                    errorEmbed.addFields({
                        name: 'Reason',
                        value: 'There was an error accessing the database. Please try again.'
                    });
                    break;
                default:
                    errorEmbed.addFields({
                        name: 'Reason',
                        value: 'An unexpected error occurred. Please try again later.'
                    });
            }
        }

        try {
            await message.reply({ embeds: [errorEmbed] });
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
            try {
                await message.channel.send({ embeds: [errorEmbed] });
            } catch (channelError) {
                console.error('Could not send error message to channel:', channelError);
            }
        }
    }

    static async handleInteractionError(error, interaction) {
        console.error('Interaction error:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('There was an error processing your interaction.');

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('Error sending interaction error message:', replyError);
        }
    }

    static async handleDatabaseError(error, context) {
        console.error('Database error:', error);
        
        // Log to a file or monitoring service in production
        const errorDetails = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context
        };

        console.error('Database error details:', errorDetails);
        
        // Could add here:
        // - Error logging to a file
        // - Sending to a monitoring service
        // - Alerting administrators
        
        throw {
            code: 'DATABASE_ERROR',
            message: 'A database error occurred',
            originalError: error
        };
    }

    static async handleRuntimeError(error, context) {
        console.error('Runtime error:', error);

        // Log detailed error information
        const errorDetails = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context
        };

        console.error('Runtime error details:', errorDetails);

        // Could add here:
        // - Error logging to a file
        // - Sending to a monitoring service
        // - Alerting administrators
        
        return {
            code: 'RUNTIME_ERROR',
            message: 'An unexpected error occurred',
            originalError: error
        };
    }
}

module.exports = ErrorHandler;
