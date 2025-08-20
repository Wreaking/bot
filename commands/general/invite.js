const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link to add to other servers'),
    async execute(interaction) {
        try {
            const clientId = interaction.client.user.id;
            const permissions = [
                'ViewChannels',
                'SendMessages',
                'UseSlashCommands',
                'EmbedLinks',
                'ReadMessageHistory',
                'UseExternalEmojis',
                'AddReactions'
            ];
            
            const permissionValue = '2147483648'; // Basic bot permissions
            const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissionValue}&scope=bot%20applications.commands`;

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.primary)
                .setTitle('🤖 Invite RPG Treasure Hunter Bot')
                .setDescription('Add this amazing RPG bot to your Discord server!')
                .addFields([
                    { name: '✨ Features Include', value: '• 50+ Interactive Commands\n• Economy & Trading System\n• RPG Combat & Adventures\n• Treasure Hunting\n• Crafting & Enchanting\n• Social Features & Guilds', inline: false },
                    { name: '🔐 Permissions Needed', value: '• Send Messages\n• Use Slash Commands\n• Embed Links\n• Read Message History', inline: true },
                    { name: '🎮 Categories', value: '• Economy & Banking\n• Combat & Battles\n• Crafting & Magic\n• Social & Guilds\n• Mini-games & More!', inline: true }
                ])
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'RPG Treasure Hunter Bot - Bringing RPG adventures to Discord!' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🔗 Add to Server')
                        .setStyle(ButtonStyle.Link)
                        .setURL(inviteUrl),
                    new ButtonBuilder()
                        .setLabel('📚 Documentation')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://github.com/your-repo/discord-rpg-bot'), // Update with actual docs URL
                    new ButtonBuilder()
                        .setLabel('💬 Support')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.gg/support') // Update with actual support server
                );

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Invite command error:', error);
            await interaction.reply({ 
                content: 'Error generating invite link. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};