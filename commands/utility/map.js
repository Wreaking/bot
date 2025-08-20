const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('🗺️ View your treasure map and discovered locations'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            level: 1,
            location: 'Village Square',
            discoveredLocations: ['Village Square'],
            treasuresFound: 0
        };

        const allLocations = [
            { name: 'Village Square', level: 1, treasures: 2, discovered: true },
            { name: 'Mystic Forest', level: 1, treasures: 5, discovered: userProfile.discoveredLocations?.includes('Mystic Forest') },
            { name: 'Crystal Caves', level: 5, treasures: 8, discovered: userProfile.discoveredLocations?.includes('Crystal Caves') },
            { name: 'Ancient Ruins', level: 8, treasures: 12, discovered: userProfile.discoveredLocations?.includes('Ancient Ruins') },
            { name: 'Dragon\'s Peak', level: 10, treasures: 15, discovered: userProfile.discoveredLocations?.includes('Dragon\'s Peak') },
            { name: 'Sunken Temple', level: 12, treasures: 20, discovered: userProfile.discoveredLocations?.includes('Sunken Temple') },
            { name: 'Shadow Realm', level: 15, treasures: 25, discovered: userProfile.discoveredLocations?.includes('Shadow Realm') },
            { name: 'Celestial Observatory', level: 18, treasures: 30, discovered: userProfile.discoveredLocations?.includes('Celestial Observatory') },
            { name: 'Void Nexus', level: 20, treasures: 50, discovered: userProfile.discoveredLocations?.includes('Void Nexus') }
        ];

        const discoveredCount = allLocations.filter(loc => loc.discovered).length;
        const totalTreasures = allLocations.reduce((sum, loc) => loc.discovered ? sum + loc.treasures : sum, 0);

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🗺️ Treasure Hunter\'s Map')
            .setDescription('**Your Personal Adventure Chart**\n\nTrack your discoveries and plan your next expedition!')
            .addFields(
                { name: '📍 Current Location', value: userProfile.location || 'Village Square', inline: true },
                { name: '🏴‍☠️ Locations Discovered', value: `${discoveredCount}/9`, inline: true },
                { name: '💎 Available Treasures', value: `${totalTreasures} total`, inline: true }
            );

        // Create a visual map representation
        let mapDisplay = '```\n';
        mapDisplay += '    🏰 Village Square (✅)\n';
        mapDisplay += '    |\n';
        mapDisplay += '🌲 Forest ---- 🏔️ Crystal Caves\n';
        mapDisplay += '    |               |\n';
        mapDisplay += '🏛️ Ruins ---- 🐲 Dragon Peak\n';
        mapDisplay += '    |               |\n';
        mapDisplay += '🌊 Temple ---- 👻 Shadow Realm\n';
        mapDisplay += '    |               |\n';
        mapDisplay += '⭐ Observatory -- 🌀 Void Nexus\n';
        mapDisplay += '```';

        embed.addFields({
            name: '🗺️ World Map',
            value: mapDisplay,
            inline: false
        });

        // List discovered locations with details
        const discoveredLocations = allLocations.filter(loc => loc.discovered);
        if (discoveredLocations.length > 0) {
            embed.addFields({
                name: '🎯 Discovered Locations',
                value: discoveredLocations.map(loc => 
                    `**${loc.name}** - Level ${loc.level} (${loc.treasures} treasures)`
                ).join('\n'),
                inline: false
            });
        }

        // List undiscovered locations (if player level allows seeing them)
        const hintLocations = allLocations.filter(loc => !loc.discovered && userProfile.level >= loc.level - 2);
        if (hintLocations.length > 0) {
            embed.addFields({
                name: '🔍 Potential Discoveries',
                value: hintLocations.map(loc => 
                    `**???** - Requires Level ${loc.level} (Rumors speak of great treasures...)`
                ).join('\n'),
                inline: false
            });
        }

        const exploreButton = new ButtonBuilder()
            .setCustomId('map_explore')
            .setLabel('Explore Current Area')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔍');

        const travelButton = new ButtonBuilder()
            .setCustomId('map_travel')
            .setLabel('Fast Travel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🚀');

        const legendButton = new ButtonBuilder()
            .setCustomId('map_legend')
            .setLabel('Map Legend')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📖');

        const row = new ActionRowBuilder().addComponents(exploreButton, travelButton, legendButton);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};