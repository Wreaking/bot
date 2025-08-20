
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

const treasureLocations = [
    { name: 'Ancient Cave', difficulty: 'easy', baseReward: 50, emoji: '🕳️' },
    { name: 'Mystic Forest', difficulty: 'medium', baseReward: 100, emoji: '🌲' },
    { name: 'Dragon\'s Lair', difficulty: 'hard', baseReward: 200, emoji: '🐲' },
    { name: 'Underwater Grotto', difficulty: 'medium', baseReward: 120, emoji: '🌊' },
    { name: 'Frozen Peaks', difficulty: 'hard', baseReward: 180, emoji: '🏔️' }
];

const treasures = [
    { name: 'Gold Coins', rarity: 'common', value: 25, emoji: '🪙' },
    { name: 'Silver Goblet', rarity: 'uncommon', value: 75, emoji: '🏆' },
    { name: 'Rare Gem', rarity: 'rare', value: 150, emoji: '💎' },
    { name: 'Ancient Artifact', rarity: 'epic', value: 300, emoji: '🏺' },
    { name: 'Legendary Relic', rarity: 'legendary', value: 500, emoji: '⭐' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('treasure')
        .setDescription('🏴‍☠️ Embark on treasure hunting adventures!')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose a location to search for treasure')
                .addChoices(
                    ...treasureLocations.map(loc => ({ name: `${loc.emoji} ${loc.name}`, value: loc.name.toLowerCase().replace(/\s+/g, '_') }))
                )
        ),

    async execute(interaction) {
        try {
            const selectedLocation = interaction.options.getString('location');
            
            if (selectedLocation) {
                await this.huntTreasure(interaction, selectedLocation);
            } else {
                await this.showTreasureMap(interaction);
            }
        } catch (error) {
            console.error('Treasure command error:', error);
            await interaction.reply({
                content: '❌ An error occurred during your treasure hunt.',
                ephemeral: true
            });
        }
    },

    async showTreasureMap(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.gold || '#FFD700')
            .setTitle('🗺️ Treasure Hunter\'s Map')
            .setDescription('Choose your destination wisely, brave treasure hunter!')
            .addFields([
                {
                    name: '📍 Available Locations',
                    value: treasureLocations.map(loc => 
                        `${loc.emoji} **${loc.name}**\n` +
                        `   • Difficulty: ${loc.difficulty.charAt(0).toUpperCase() + loc.difficulty.slice(1)}\n` +
                        `   • Base Reward: ${loc.baseReward} coins\n`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '💰 Your Status',
                    value: `**Coins:** ${userData.coins || 0}\n**Level:** ${userData.level || 1}\n**Energy:** 100%`,
                    inline: true
                },
                {
                    name: '🎒 Equipment Bonus',
                    value: `**Weapon:** +10% success\n**Armor:** +5% safety\n**Luck Charm:** +15% rewards`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Each hunt costs energy and time. Choose carefully!' })
            .setTimestamp();

        const locationSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`treasure_location_${interaction.user.id}`)
                    .setPlaceholder('🗺️ Select a treasure location')
                    .addOptions(
                        treasureLocations.map(loc => ({
                            label: loc.name,
                            description: `${loc.difficulty} difficulty - ${loc.baseReward} base coins`,
                            value: loc.name.toLowerCase().replace(/\s+/g, '_'),
                            emoji: loc.emoji
                        }))
                    )
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_quick_${interaction.user.id}`)
                    .setLabel('⚡ Quick Hunt')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`treasure_expedition_${interaction.user.id}`)
                    .setLabel('🗺️ Expedition')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`treasure_records_${interaction.user.id}`)
                    .setLabel('📊 Records')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = { embeds: [embed], components: [locationSelect, actionButtons] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    },

    async huntTreasure(interaction, locationKey) {
        const location = treasureLocations.find(loc => 
            loc.name.toLowerCase().replace(/\s+/g, '_') === locationKey
        );
        
        if (!location) {
            await interaction.reply({
                content: '❌ Invalid treasure location selected.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        // Simulate treasure hunting delay
        setTimeout(async () => {
            await this.processTreasureHunt(interaction, location);
        }, 2000);

        // Show initial hunting message
        const huntingEmbed = new EmbedBuilder()
            .setColor(config.embedColors?.warning || '#ffaa00')
            .setTitle(`${location.emoji} Searching ${location.name}...`)
            .setDescription('🔍 You venture into the unknown, searching for hidden treasures...')
            .addFields([
                { name: '📍 Location', value: location.name, inline: true },
                { name: '⚡ Difficulty', value: location.difficulty, inline: true },
                { name: '⏱️ Status', value: 'Searching...', inline: true }
            ])
            .setFooter({ text: 'Hold tight, adventure awaits!' });

        await interaction.editReply({ embeds: [huntingEmbed] });
    },

    async processTreasureHunt(interaction, location) {
        const userData = await db.getPlayer(interaction.user.id);
        
        // Calculate success probability based on difficulty and player level
        const difficultyMultiplier = { easy: 0.8, medium: 0.6, hard: 0.4 };
        const levelBonus = Math.min(0.3, (userData.level || 1) * 0.02);
        const successRate = difficultyMultiplier[location.difficulty] + levelBonus;
        
        const isSuccessful = Math.random() < successRate;
        
        if (isSuccessful) {
            await this.handleSuccessfulHunt(interaction, location, userData);
        } else {
            await this.handleFailedHunt(interaction, location);
        }
    },

    async handleSuccessfulHunt(interaction, location, userData) {
        // Determine treasure found
        const rarityWeights = { common: 0.5, uncommon: 0.3, rare: 0.15, epic: 0.04, legendary: 0.01 };
        const randomValue = Math.random();
        let cumulativeWeight = 0;
        let selectedRarity = 'common';
        
        for (const [rarity, weight] of Object.entries(rarityWeights)) {
            cumulativeWeight += weight;
            if (randomValue <= cumulativeWeight) {
                selectedRarity = rarity;
                break;
            }
        }
        
        const availableTreasures = treasures.filter(t => t.rarity === selectedRarity);
        const foundTreasure = availableTreasures[Math.floor(Math.random() * availableTreasures.length)];
        
        // Calculate final reward
        const baseReward = location.baseReward;
        const treasureBonus = foundTreasure.value;
        const levelMultiplier = 1 + ((userData.level || 1) - 1) * 0.1;
        const totalReward = Math.floor((baseReward + treasureBonus) * levelMultiplier);
        
        // Update user data
        await db.updatePlayer(interaction.user.id, {
            coins: (userData.coins || 0) + totalReward,
            experience: (userData.experience || 0) + Math.floor(totalReward * 0.1),
            statistics: {
                ...userData.statistics,
                treasuresFound: (userData.statistics?.treasuresFound || 0) + 1,
                totalCoinsEarned: (userData.statistics?.totalCoinsEarned || 0) + totalReward
            }
        });

        const rarityColors = {
            common: '#8B4513',
            uncommon: '#32CD32',
            rare: '#4169E1',
            epic: '#9932CC',
            legendary: '#FFD700'
        };

        const successEmbed = new EmbedBuilder()
            .setColor(rarityColors[selectedRarity])
            .setTitle(`🎉 Treasure Found at ${location.name}!`)
            .setDescription(`Congratulations! You discovered a **${selectedRarity}** treasure!`)
            .addFields([
                { name: '💎 Treasure', value: `${foundTreasure.emoji} **${foundTreasure.name}**`, inline: true },
                { name: '💰 Value', value: `${totalReward} coins`, inline: true },
                { name: '⭐ Experience', value: `+${Math.floor(totalReward * 0.1)} XP`, inline: true },
                { name: '🏆 Rarity', value: selectedRarity.charAt(0).toUpperCase() + selectedRarity.slice(1), inline: true },
                { name: '📊 Your Total', value: `${(userData.coins || 0) + totalReward} coins`, inline: true },
                { name: '🎯 Success Rate', value: '🔥 Great job!', inline: true }
            ])
            .setFooter({ text: `Found at ${location.emoji} ${location.name}` })
            .setTimestamp();

        const continueButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_again_${interaction.user.id}`)
                    .setLabel('🔄 Hunt Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`treasure_map_${interaction.user.id}`)
                    .setLabel('🗺️ Treasure Map')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_celebrate_${interaction.user.id}`)
                    .setLabel('🎉 Celebrate')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({ embeds: [successEmbed], components: [continueButtons] });
    },

    async handleFailedHunt(interaction, location) {
        const failureReasons = [
            'The treasure was too well hidden!',
            'Wild creatures scared you away!',
            'You lost your way in the darkness!',
            'The location was already looted!',
            'Dangerous traps blocked your path!'
        ];
        
        const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        
        const failureEmbed = new EmbedBuilder()
            .setColor(config.embedColors?.error || '#ff0000')
            .setTitle(`${location.emoji} Hunt Failed at ${location.name}`)
            .setDescription(`**${randomReason}**\n\nDon't give up! Every failure teaches you something new.`)
            .addFields([
                { name: '📍 Location', value: location.name, inline: true },
                { name: '⚡ Difficulty', value: location.difficulty, inline: true },
                { name: '🎓 Experience', value: '+5 XP (for trying)', inline: true }
            ])
            .setFooter({ text: 'Better luck next time, treasure hunter!' })
            .setTimestamp();

        const retryButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_retry_${interaction.user.id}_${location.name.toLowerCase().replace(/\s+/g, '_')}`)
                    .setLabel('🔄 Try Again')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`treasure_map_${interaction.user.id}`)
                    .setLabel('🗺️ Choose Different Location')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_tips_${interaction.user.id}`)
                    .setLabel('💡 Get Tips')
                    .setStyle(ButtonStyle.Primary)
            );

        // Still give small XP for attempting
        const userData = await db.getPlayer(interaction.user.id);
        await db.updatePlayer(interaction.user.id, {
            experience: (userData.experience || 0) + 5
        });

        await interaction.editReply({ embeds: [failureEmbed], components: [retryButtons] });
    },

    // Button handlers
    buttonHandlers: {
        quick: async function(interaction) {
            // Quick hunt picks a random easy location
            const easyLocations = treasureLocations.filter(loc => loc.difficulty === 'easy');
            const randomLocation = easyLocations[Math.floor(Math.random() * easyLocations.length)];
            await this.huntTreasure(interaction, randomLocation.name.toLowerCase().replace(/\s+/g, '_'));
        },

        expedition: async function(interaction) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099ff')
                .setTitle('🗺️ Expedition Mode')
                .setDescription('Plan a longer treasure hunting expedition!')
                .addFields([
                    { name: '⏱️ Duration', value: '2-6 hours', inline: true },
                    { name: '💰 Rewards', value: '5x normal rewards', inline: true },
                    { name: '🎯 Success Rate', value: 'Higher chance', inline: true },
                    { name: '📋 Requirements', value: '• Level 10+\n• 500 coins entry fee\n• Premium equipment', inline: false }
                ])
                .setFooter({ text: 'Coming soon in a future update!' });

            await interaction.update({ embeds: [embed], components: [] });
        },

        records: async function(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.gold || '#FFD700')
                .setTitle('📊 Your Treasure Hunting Records')
                .addFields([
                    { name: '🏆 Treasures Found', value: `${userData.statistics?.treasuresFound || 0}`, inline: true },
                    { name: '💰 Total Earned', value: `${userData.statistics?.totalCoinsEarned || 0} coins`, inline: true },
                    { name: '📈 Success Rate', value: '67%', inline: true },
                    { name: '💎 Rarest Find', value: 'Epic Artifact', inline: true },
                    { name: '📍 Favorite Location', value: 'Mystic Forest', inline: true },
                    { name: '⭐ Hunter Rank', value: 'Seasoned Explorer', inline: true }
                ])
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        },

        again: async function(interaction) {
            await this.showTreasureMap(interaction);
        },

        map: async function(interaction) {
            await this.showTreasureMap(interaction);
        },

        celebrate: async function(interaction) {
            const celebrationMessages = [
                '🎉 You dance with joy at your discovery!',
                '🥳 You shout with excitement!',
                '🎊 You do a victory pose!',
                '🕺 You celebrate your success!',
                '💃 You can\'t contain your happiness!'
            ];
            
            const randomCelebration = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
            
            await interaction.update({
                content: randomCelebration,
                components: []
            });
        },

        retry: async function(interaction) {
            const locationKey = interaction.customId.split('_').pop();
            await this.huntTreasure(interaction, locationKey);
        },

        tips: async function(interaction) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099ff')
                .setTitle('💡 Treasure Hunting Tips')
                .addFields([
                    { name: '📈 Level Up', value: 'Higher levels increase success rates', inline: false },
                    { name: '🎒 Equipment', value: 'Better gear improves your chances', inline: false },
                    { name: '🕐 Timing', value: 'Some locations are better at certain times', inline: false },
                    { name: '👥 Team Up', value: 'Party hunting gives bonuses', inline: false }
                ])
                .setFooter({ text: 'Practice makes perfect!' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    },

    // Select menu handler
    selectMenuHandlers: {
        location: async function(interaction) {
            const selectedLocation = interaction.values[0];
            await this.huntTreasure(interaction, selectedLocation);
        }
    }
};
