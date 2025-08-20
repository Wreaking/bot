const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('travel')
        .setDescription('🗺️ Travel to different regions for unique treasures'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            location: 'Village Square'
        };

        const locations = [
            { name: 'Mystic Forest', cost: 25, level: 1, treasures: 'Herbs, Crystals, Ancient Coins' },
            { name: 'Crystal Caves', cost: 50, level: 5, treasures: 'Gems, Ores, Magic Stones' },
            { name: 'Dragon\'s Peak', cost: 100, level: 10, treasures: 'Dragon Scales, Legendary Items' },
            { name: 'Sunken Ruins', cost: 150, level: 15, treasures: 'Artifacts, Ancient Scrolls' },
            { name: 'Shadow Realm', cost: 250, level: 20, treasures: 'Dark Relics, Void Crystals' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🗺️ Travel Agency')
            .setDescription('**Adventure Awaits in Distant Lands!**\n\nChoose your destination wisely - each location offers unique treasures!')
            .addFields(
                { name: '📍 Current Location', value: userProfile.location || 'Village Square', inline: true },
                { name: '💰 Available Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '⭐ Your Level', value: `${userProfile.level || 1}`, inline: true }
            );

        locations.forEach(location => {
            const accessible = userProfile.level >= location.level;
            const status = accessible ? '✅ Available' : `🔒 Requires Level ${location.level}`;
            
            embed.addFields({
                name: `🌍 ${location.name}`,
                value: `**Cost:** ${location.cost} coins\n**Min Level:** ${location.level}\n**Treasures:** ${location.treasures}\n**Status:** ${status}`,
                inline: true
            });
        });

        const buttons = locations
            .filter(location => userProfile.level >= location.level)
            .map((location, index) => 
                new ButtonBuilder()
                    .setCustomId(`travel_${index}`)
                    .setLabel(`Travel to ${location.name}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚀')
            );

        const returnButton = new ButtonBuilder()
            .setCustomId('travel_home')
            .setLabel('Return to Village')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏠');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(returnButton);

        const components = [];
        if (buttons.length > 0) components.push(row1);
        if (buttons.length > 2) components.push(row2);
        components.push(row3);

        await interaction.reply({ embeds: [embed], components });
    }
};