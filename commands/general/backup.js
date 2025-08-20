const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Create a backup of your player data'),
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const userData = await db.getPlayer(userId);
            
            if (!userData) {
                return await interaction.reply({ 
                    content: 'No player data found to backup!', 
                    ephemeral: true 
                });
            }

            const backupData = {
                userId: userId,
                username: interaction.user.username,
                timestamp: Date.now(),
                data: userData
            };

            // Store backup in database with timestamp
            const backupId = `backup_${userId}_${Date.now()}`;
            await db.setData(backupId, backupData);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('💾 Data Backup Created')
                .setDescription('Your player data has been safely backed up!')
                .addFields([
                    { name: 'Backup ID', value: backupId.slice(-10), inline: true },
                    { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: 'Items Backed Up', value: `${Object.keys(userData).length} data fields`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'Keep your backup ID safe for restoration' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Backup command error:', error);
            await interaction.reply({ 
                content: 'Error creating backup. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};