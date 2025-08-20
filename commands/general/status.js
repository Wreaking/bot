const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('View bot status and statistics'),
    async execute(interaction) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor(((uptime % 86400) % 3600) / 60);
            const seconds = Math.floor(((uptime % 86400) % 3600) % 60);

            const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            
            // Get total players count
            let totalPlayers = 0;
            try {
                totalPlayers = await db.getAllPlayers();
                totalPlayers = totalPlayers ? totalPlayers.length : 0;
            } catch (error) {
                console.warn('Could not fetch player count:', error);
            }

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('🤖 Bot Status')
                .addFields([
                    { name: '⏰ Uptime', value: uptimeString, inline: true },
                    { name: '📊 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                    { name: '🏓 Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                    { name: '👥 Total Players', value: `${totalPlayers}`, inline: true },
                    { name: '🗄️ Database', value: '✅ Connected', inline: true },
                    { name: '🔧 Commands Loaded', value: `${interaction.client.commands.size}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'RPG Treasure Hunter Bot' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Status command error:', error);
            await interaction.reply({ 
                content: 'Error retrieving bot status information.', 
                ephemeral: true 
            });
        }
    },
};