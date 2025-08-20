const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scout')
        .setDescription('🔍 Scout ahead to discover new treasure locations'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 },
            stats: { level: 1 },
            skills: { scouting: 1 },
            discoveries: []
        };

        const scoutingAreas = [
            {
                name: 'Nearby Woods',
                difficulty: 'Easy',
                cost: 20,
                discoveries: ['Hidden Cave', 'Old Campsite', 'Berry Grove'],
                emoji: '🌲'
            },
            {
                name: 'Mountain Trails',
                difficulty: 'Medium',
                cost: 50,
                discoveries: ['Ancient Shrine', 'Crystal Outcrop', 'Eagle\'s Nest'],
                emoji: '⛰️'
            },
            {
                name: 'Misty Marshlands',
                difficulty: 'Hard',
                cost: 100,
                discoveries: ['Sunken Ruins', 'Will-o\'-wisp Grove', 'Forgotten Temple'],
                emoji: '🌫️'
            },
            {
                name: 'Uncharted Territories',
                difficulty: 'Extreme',
                cost: 200,
                discoveries: ['Lost Civilization', 'Dragon Lair', 'Portal Nexus'],
                emoji: '🗺️'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🔍 Scouting Expedition')
            .setDescription('**Explore unknown territories to find new treasure locations!**\n\nScouting reveals hidden areas with valuable secrets.')
            .addFields(
                { name: '🎯 Scouting Level', value: `${userProfile.skills?.scouting || 1}`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '📍 Areas Discovered', value: `${userProfile.discoveries?.length || 0}`, inline: true }
            );

        scoutingAreas.forEach(area => {
            const requiredLevel = area.difficulty === 'Easy' ? 1 : area.difficulty === 'Medium' ? 5 : area.difficulty === 'Hard' ? 10 : 15;
            const canScout = (userProfile.skills?.scouting || 1) >= requiredLevel && (userProfile.inventory?.coins || 0) >= area.cost;
            const status = canScout ? '✅ Available' : `🔒 Requires Level ${requiredLevel}`;

            embed.addFields({
                name: `${area.emoji} ${area.name}`,
                value: `**Difficulty:** ${area.difficulty}\n**Cost:** ${area.cost} coins\n**Possible Finds:** ${area.discoveries.join(', ')}\n**Status:** ${status}`,
                inline: true
            });
        });

        const scoutButtons = scoutingAreas.map((area, index) => 
            new ButtonBuilder()
                .setCustomId(`scout_${index}`)
                .setLabel(`Scout ${area.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(area.emoji)
        );

        const mapButton = new ButtonBuilder()
            .setCustomId('scout_map')
            .setLabel('View Discoveries')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗺️');

        const upgradeButton = new ButtonBuilder()
            .setCustomId('scout_upgrade')
            .setLabel('Upgrade Equipment')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔧');

        const row1 = new ActionRowBuilder().addComponents(scoutButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(scoutButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(mapButton, upgradeButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};