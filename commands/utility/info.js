const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about the bot and its features'),
    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('🏴‍☠️ RPG Treasure Hunter Bot')
                .setDescription('A comprehensive Discord RPG bot with treasure hunting, combat, economy, and social features!')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields([
                    { 
                        name: '🎮 Game Features', 
                        value: '• **Economy System**: Earn coins through work, daily rewards, and adventures\n• **Combat System**: Battle monsters, other players, and dungeon bosses\n• **Treasure Hunting**: Solve clues and discover hidden treasures\n• **Crafting & Magic**: Create items, brew potions, and cast spells', 
                        inline: false 
                    },
                    { 
                        name: '🏛️ Social Features', 
                        value: '• **Guilds**: Join guilds and participate in group activities\n• **Achievements**: Unlock achievements and earn rewards\n• **Leaderboards**: Compete with other players\n• **Tournaments**: Participate in competitive events', 
                        inline: false 
                    },
                    { 
                        name: '📊 Statistics', 
                        value: `• **Commands**: ${interaction.client.commands.size}+\n• **Categories**: 15+ different command types\n• **Uptime**: Online 24/7\n• **Support**: Active community`, 
                        inline: true 
                    },
                    { 
                        name: '🚀 Getting Started', 
                        value: '• Use `/help` to see all commands\n• Start with `/profile` to create your character\n• Try `/daily` for your first coins\n• Use `/hunt` to begin treasure hunting!', 
                        inline: true 
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Join the adventure today! Use /help to get started.' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Info command error:', error);
            await interaction.reply({ 
                content: 'Error retrieving bot information.', 
                ephemeral: true 
            });
        }
    },
};