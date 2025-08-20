
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('🗺️ View your treasure map and discovered locations')
        .addStringOption(option =>
            option.setName('view')
                .setDescription('Choose map view type')
                .setRequired(false)
                .addChoices(
                    { name: '🌍 World Map', value: 'world' },
                    { name: '📍 Current Area', value: 'current' },
                    { name: '🗺️ Detailed View', value: 'detailed' },
                    { name: '📊 Statistics', value: 'stats' }
                )),
    
    async execute(interaction) {
        const viewType = interaction.options?.getString('view') || 'world';
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            level: 1,
            location: 'Village Square',
            discoveredLocations: ['Village Square'],
            treasuresFound: 0,
            mapPreferences: {
                showCoordinates: true,
                showDifficulty: true,
                compactView: false
            }
        };

        const allLocations = [
            { 
                id: 'village_square',
                name: 'Village Square', 
                level: 1, 
                treasures: 2, 
                discovered: true,
                coordinates: 'A1',
                difficulty: 'Beginner',
                description: 'A peaceful starting area with friendly merchants',
                weather: 'Clear',
                enemies: 'None',
                resources: ['Copper', 'Wood'],
                npcs: ['Merchant Tom', 'Guard Captain'],
                specialFeatures: ['Market', 'Inn', 'Training Grounds']
            },
            { 
                id: 'mystic_forest',
                name: 'Mystic Forest', 
                level: 3, 
                treasures: 5, 
                discovered: userProfile.discoveredLocations?.includes('Mystic Forest'),
                coordinates: 'B2',
                difficulty: 'Easy',
                description: 'A mysterious forest filled with magical creatures',
                weather: 'Misty',
                enemies: ['Forest Sprites', 'Wild Wolves'],
                resources: ['Magic Herbs', 'Enchanted Wood'],
                npcs: ['Elder Druid', 'Forest Guardian'],
                specialFeatures: ['Ancient Tree', 'Hidden Springs']
            },
            { 
                id: 'crystal_caves',
                name: 'Crystal Caves', 
                level: 5, 
                treasures: 8, 
                discovered: userProfile.discoveredLocations?.includes('Crystal Caves'),
                coordinates: 'C3',
                difficulty: 'Medium',
                description: 'Shimmering caves filled with precious crystals',
                weather: 'Cool',
                enemies: ['Crystal Golems', 'Cave Bats'],
                resources: ['Crystals', 'Gems', 'Rare Metals'],
                npcs: ['Crystal Sage', 'Mining Foreman'],
                specialFeatures: ['Crystal Formations', 'Underground Lake']
            },
            { 
                id: 'ancient_ruins',
                name: 'Ancient Ruins', 
                level: 8, 
                treasures: 12, 
                discovered: userProfile.discoveredLocations?.includes('Ancient Ruins'),
                coordinates: 'D4',
                difficulty: 'Hard',
                description: 'Mysterious ruins of an ancient civilization',
                weather: 'Stormy',
                enemies: ['Ancient Guardians', 'Spectral Warriors'],
                resources: ['Ancient Artifacts', 'Rune Stones'],
                npcs: ['Archaeologist', 'Rune Keeper'],
                specialFeatures: ['Temple Complex', 'Hidden Chambers']
            },
            { 
                id: 'dragons_peak',
                name: 'Dragon\'s Peak', 
                level: 12, 
                treasures: 20, 
                discovered: userProfile.discoveredLocations?.includes('Dragon\'s Peak'),
                coordinates: 'E5',
                difficulty: 'Expert',
                description: 'The legendary dwelling of ancient dragons',
                weather: 'Volcanic',
                enemies: ['Fire Dragons', 'Lava Elementals'],
                resources: ['Dragon Scales', 'Volcanic Glass'],
                npcs: ['Dragon Lord', 'Fire Mage'],
                specialFeatures: ['Dragon Lair', 'Volcanic Forge']
            },
            { 
                id: 'void_nexus',
                name: 'Void Nexus', 
                level: 20, 
                treasures: 50, 
                discovered: userProfile.discoveredLocations?.includes('Void Nexus'),
                coordinates: 'Z9',
                difficulty: 'Legendary',
                description: 'A realm beyond reality where space and time converge',
                weather: 'Chaotic',
                enemies: ['Void Lords', 'Reality Reapers'],
                resources: ['Void Crystals', 'Temporal Essence'],
                npcs: ['Void Keeper', 'Time Sage'],
                specialFeatures: ['Portal Network', 'Reality Anchors']
            }
        ];

        switch (viewType) {
            case 'world':
                await this.showWorldMap(interaction, userProfile, allLocations);
                break;
            case 'current':
                await this.showCurrentArea(interaction, userProfile, allLocations);
                break;
            case 'detailed':
                await this.showDetailedView(interaction, userProfile, allLocations);
                break;
            case 'stats':
                await this.showMapStatistics(interaction, userProfile, allLocations);
                break;
            default:
                await this.showWorldMap(interaction, userProfile, allLocations);
        }
    },

    async showWorldMap(interaction, userProfile, allLocations) {
        const discoveredCount = allLocations.filter(loc => loc.discovered).length;
        const totalTreasures = allLocations.reduce((sum, loc) => loc.discovered ? sum + loc.treasures : sum, 0);

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🗺️ Treasure Hunter\'s World Map')
            .setDescription('**Your Personal Adventure Chart**\n\nExplore the vast world and discover hidden treasures!')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/treasure-map.png')
            .addFields([
                { 
                    name: '📍 Current Location', 
                    value: `**${userProfile.location || 'Village Square'}**\n${this.getLocationEmoji(userProfile.location)}`, 
                    inline: true 
                },
                { 
                    name: '🗺️ Discovery Progress', 
                    value: `${discoveredCount}/${allLocations.length} locations\n${this.createProgressBar(discoveredCount, allLocations.length)}`, 
                    inline: true 
                },
                { 
                    name: '💎 Available Treasures', 
                    value: `${totalTreasures} discovered\n🏆 ${allLocations.reduce((sum, loc) => sum + loc.treasures, 0)} total`, 
                    inline: true 
                }
            ]);

        // Create visual world map
        let mapDisplay = '```\n🗺️  TREASURE HUNTER WORLD MAP\n' +
                         '════════════════════════════════\n' +
                         '    A   B   C   D   E   F   G   H\n' +
                         '1  🏰  🌲  ⛰️   🏛️   🐲  🌊  ⭐  🌀\n' +
                         '2  🛡️   🧙  💎  ⚔️   🔥  🌊  🌟  🖤\n' +
                         '3  🏘️   🌿  ⛏️   📿  🗡️   🏔️   ✨  ⚫\n\n' +
                         'Legend:\n' +
                         '🏰 Village Square  🌲 Mystic Forest\n' +
                         '💎 Crystal Caves  🏛️ Ancient Ruins\n' +
                         '🐲 Dragon\'s Peak  🌀 Void Nexus\n' +
                         '```';

        embed.addFields({ name: '🌍 World Overview', value: mapDisplay, inline: false });

        // Add discovered locations details
        const discoveredLocations = allLocations.filter(loc => loc.discovered);
        if (discoveredLocations.length > 0) {
            const locationList = discoveredLocations.map(loc => 
                `${this.getDifficultyEmoji(loc.difficulty)} **${loc.name}** (${loc.coordinates})\n` +
                `└ Level ${loc.level} • ${loc.treasures} treasures • ${loc.weather}`
            ).join('\n\n');
            
            embed.addFields({ 
                name: '🎯 Discovered Locations', 
                value: locationList, 
                inline: false 
            });
        }

        // Add hints for undiscovered areas
        const hintLocations = allLocations.filter(loc => !loc.discovered && userProfile.level >= loc.level - 3);
        if (hintLocations.length > 0) {
            const hintList = hintLocations.map(loc => 
                `❓ **Mysterious Area** (${loc.coordinates})\n` +
                `└ Requires Level ${loc.level} • Legends speak of ${loc.treasures} treasures...`
            ).join('\n\n');
            
            embed.addFields({ 
                name: '🔍 Potential Discoveries', 
                value: hintList, 
                inline: false 
            });
        }

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('map_location_select')
            .setPlaceholder('🏛️ Select a location to explore...')
            .addOptions(
                allLocations.filter(loc => loc.discovered).map(loc => ({
                    label: loc.name,
                    description: `Level ${loc.level} • ${loc.difficulty} • ${loc.treasures} treasures`,
                    value: loc.id,
                    emoji: this.getLocationEmoji(loc.name)
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('map_current_area')
                    .setLabel('Current Area')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setCustomId('map_fast_travel')
                    .setLabel('Fast Travel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('map_explore')
                    .setLabel('Explore')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('map_settings')
                    .setLabel('Map Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️')
            );

        const components = [buttons];
        if (discoveredLocations.length > 0) {
            components.unshift(new ActionRowBuilder().addComponents(locationSelect));
        }

        await interaction.reply({ embeds: [embed], components });
    },

    async showCurrentArea(interaction, userProfile, allLocations) {
        const currentLocation = allLocations.find(loc => 
            loc.name === userProfile.location || loc.id === userProfile.location
        ) || allLocations[0];

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`📍 ${currentLocation.name}`)
            .setDescription(`**${currentLocation.description}**\n\n*You are currently exploring this area...*`)
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/location-icon.png')
            .addFields([
                { 
                    name: '🗺️ Location Info', 
                    value: `**Coordinates:** ${currentLocation.coordinates}\n**Difficulty:** ${this.getDifficultyEmoji(currentLocation.difficulty)} ${currentLocation.difficulty}\n**Weather:** ${this.getWeatherEmoji(currentLocation.weather)} ${currentLocation.weather}`, 
                    inline: true 
                },
                { 
                    name: '💎 Treasures & Rewards', 
                    value: `**Available:** ${currentLocation.treasures} treasures\n**Required Level:** ${currentLocation.level}\n**Success Rate:** ${this.calculateSuccessRate(userProfile.level, currentLocation.level)}%`, 
                    inline: true 
                },
                { 
                    name: '⚔️ Dangers', 
                    value: currentLocation.enemies.length > 0 ? currentLocation.enemies.map(enemy => `• ${enemy}`).join('\n') : '• Safe area', 
                    inline: true 
                },
                { 
                    name: '🎒 Available Resources', 
                    value: currentLocation.resources.map(resource => `• ${resource}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '👥 NPCs Present', 
                    value: currentLocation.npcs.map(npc => `• ${npc}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '✨ Special Features', 
                    value: currentLocation.specialFeatures.map(feature => `• ${feature}`).join('\n'), 
                    inline: true 
                }
            ])
            .setFooter({ text: `Use /hunt to search for treasures in this area!` });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('area_hunt')
                    .setLabel('Hunt Treasures')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('area_gather')
                    .setLabel('Gather Resources')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎒'),
                new ButtonBuilder()
                    .setCustomId('area_interact')
                    .setLabel('Interact with NPCs')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setCustomId('area_leave')
                    .setLabel('Travel Away')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚶')
            );

        await interaction.reply({ embeds: [embed], components: [actionButtons] });
    },

    async showDetailedView(interaction, userProfile, allLocations) {
        // Implementation for detailed view with mini-maps and advanced info
        const embed = new EmbedBuilder()
            .setColor('#9400D3')
            .setTitle('🗺️ Detailed Map Analysis')
            .setDescription('**Advanced Cartographer View**\n\nDetailed analysis of all discovered territories');

        // Implementation details...
        await interaction.reply({ content: '🚧 Detailed view coming soon!', ephemeral: true });
    },

    async showMapStatistics(interaction, userProfile, allLocations) {
        // Implementation for map statistics
        const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('📊 Map Statistics & Analytics')
            .setDescription('**Your Exploration Analytics**\n\nTrack your discovery progress and achievements');

        // Implementation details...
        await interaction.reply({ content: '🚧 Statistics view coming soon!', ephemeral: true });
    },

    // Helper functions
    getLocationEmoji(locationName) {
        const emojis = {
            'Village Square': '🏰',
            'Mystic Forest': '🌲',
            'Crystal Caves': '💎',
            'Ancient Ruins': '🏛️',
            'Dragon\'s Peak': '🐲',
            'Void Nexus': '🌀'
        };
        return emojis[locationName] || '📍';
    },

    getDifficultyEmoji(difficulty) {
        const emojis = {
            'Beginner': '🟢',
            'Easy': '🟡',
            'Medium': '🟠',
            'Hard': '🔴',
            'Expert': '🟣',
            'Legendary': '⚫'
        };
        return emojis[difficulty] || '⚪';
    },

    getWeatherEmoji(weather) {
        const emojis = {
            'Clear': '☀️',
            'Misty': '🌫️',
            'Cool': '❄️',
            'Stormy': '⛈️',
            'Volcanic': '🌋',
            'Chaotic': '🌪️'
        };
        return emojis[weather] || '🌤️';
    },

    createProgressBar(current, total, length = 10) {
        const percentage = current / total;
        const filled = Math.round(percentage * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
    },

    calculateSuccessRate(playerLevel, locationLevel) {
        if (playerLevel >= locationLevel) {
            return Math.min(95, 60 + (playerLevel - locationLevel) * 5);
        } else {
            return Math.max(5, 60 - (locationLevel - playerLevel) * 10);
        }
    }
};
