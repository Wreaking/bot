const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Fish types and their properties
const fishTypes = {
    common: {
        fish: [
            { name: 'Herring', value: 5, emoji: '🐟' },
            { name: 'Mackerel', value: 8, emoji: '🐟' },
            { name: 'Cod', value: 10, emoji: '🐟' }
        ],
        chance: 0.60,
        color: '#32CD32'
    },
    uncommon: {
        fish: [
            { name: 'Salmon', value: 15, emoji: '🐠' },
            { name: 'Tuna', value: 20, emoji: '🐠' },
            { name: 'Bass', value: 25, emoji: '🐠' }
        ],
        chance: 0.25,
        color: '#4169E1'
    },
    rare: {
        fish: [
            { name: 'Swordfish', value: 50, emoji: '🦈' },
            { name: 'Giant Squid', value: 75, emoji: '🦑' },
            { name: 'Shark', value: 100, emoji: '🦈' }
        ],
        chance: 0.12,
        color: '#9932CC'
    },
    legendary: {
        fish: [
            { name: 'Golden Fish', value: 200, emoji: '✨' },
            { name: 'Leviathan', value: 500, emoji: '🐋' },
            { name: 'Dragon Fish', value: 1000, emoji: '🐉' }
        ],
        chance: 0.03,
        color: '#FFD700'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cast')
        .setDescription('🎣 Cast your line in mystical waters')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Where to fish')
                .setRequired(true)
                .addChoices(
                    { name: '🌊 Coastal Waters', value: 'coast' },
                    { name: '🏞️ River Bank', value: 'river' },
                    { name: '🌊 Deep Sea', value: 'deep' },
                    { name: '✨ Mystic Lake', value: 'mystic' }
                ))
        .addStringOption(option =>
            option.setName('bait')
                .setDescription('Type of bait to use')
                .setRequired(false)
                .addChoices(
                    { name: '🪱 Worms', value: 'worm' },
                    { name: '🐟 Minnows', value: 'minnow' },
                    { name: '🦐 Magic Shrimp', value: 'shrimp' }
                )),
    
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const location = interaction.options.getString('location');
            const baitType = interaction.options.getString('bait');
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                equipment: {
                    rod: 'wooden_rod',
                    bait: [],
                    accessories: []
                },
                fishCaught: {
                    common: 0,
                    uncommon: 0,
                    rare: 0,
                    legendary: 0
                },
                coins: 100,
                rodDurability: 50
            };

            // Check rod durability
            if (player.rodDurability <= 0) {
                await interaction.editReply({
                    content: '❌ Your fishing rod is broken! Repair it at the tackle shop.',
                    ephemeral: true
                });
                return;
            }

            // Check if they have the selected bait
            if (baitType && !player.equipment.bait.includes(baitType)) {
                await interaction.editReply({
                    content: '❌ You don\'t have that type of bait! Visit the tackle shop.',
                    ephemeral: true
                });
                return;
            }

            // Calculate catch chances based on location, equipment, and bait
            let catchModifier = 1.0;
            
            // Location modifiers
            switch (location) {
                case 'coast':
                    catchModifier *= 1.0;
                    break;
                case 'river':
                    catchModifier *= 1.2;
                    break;
                case 'deep':
                    if (player.fishingLevel < 10) {
                        await interaction.editReply({
                            content: '❌ You need Fishing Level 10 to fish in deep waters!',
                            ephemeral: true
                        });
                        return;
                    }
                    catchModifier *= 1.5;
                    break;
                case 'mystic':
                    if (player.fishingLevel < 20) {
                        await interaction.editReply({
                            content: '❌ You need Fishing Level 20 to fish in mystic waters!',
                            ephemeral: true
                        });
                        return;
                    }
                    catchModifier *= 2.0;
                    break;
            }

            // Bait modifier
            if (baitType) {
                switch (baitType) {
                    case 'worm': catchModifier *= 1.2; break;
                    case 'minnow': catchModifier *= 1.5; break;
                    case 'shrimp': catchModifier *= 2.0; break;
                }
            }

            // Rod modifier (based on equipment)
            switch (player.equipment.rod) {
                case 'bamboo_rod': catchModifier *= 1.2; break;
                case 'carbon_rod': catchModifier *= 1.5; break;
                case 'mythril_rod': catchModifier *= 2.0; break;
            }

            // Determine catch
            let totalChance = Math.random() * catchModifier;
            let fishType = 'common';
            let bonusExp = 0;

            if (totalChance > 0.97) {
                fishType = 'legendary';
                bonusExp = 100;
            } else if (totalChance > 0.85) {
                fishType = 'rare';
                bonusExp = 50;
            } else if (totalChance > 0.60) {
                fishType = 'uncommon';
                bonusExp = 25;
            }

            // Select random fish from the type
            const fishCategory = fishTypes[fishType];
            const caughtFish = fishCategory.fish[Math.floor(Math.random() * fishCategory.fish.length)];

            // Update player data
            player.rodDurability -= 1;
            player.coins += caughtFish.value;
            player.fishCaught[fishType]++;
            const expGain = bonusExp + Math.floor(caughtFish.value / 2);
            player.fishingExp = (player.fishingExp || 0) + expGain;

            // Check for level up
            const oldLevel = player.fishingLevel;
            while (player.fishingExp >= Math.pow(player.fishingLevel, 2) * 100) {
                player.fishingLevel++;
            }

            // Remove bait if used
            if (baitType) {
                const baitIndex = player.equipment.bait.indexOf(baitType);
                if (baitIndex > -1) {
                    player.equipment.bait.splice(baitIndex, 1);
                }
            }

            await db.updatePlayer(userId, player);

            // Create response embed
            const embed = new EmbedBuilder()
                .setColor(fishCategory.color)
                .setTitle(`🎣 Fishing Results - ${location.charAt(0).toUpperCase() + location.slice(1)}`)
                .setDescription(`You caught a ${caughtFish.emoji} **${caughtFish.name}**!`)
                .addFields(
                    { name: 'Value', value: `${caughtFish.value} coins`, inline: true },
                    { name: 'Experience', value: `+${expGain} XP`, inline: true },
                    { name: 'Rod Durability', value: `${player.rodDurability}/50`, inline: true }
                );

            if (player.fishingLevel > oldLevel) {
                embed.addFields({
                    name: '🎉 Level Up!',
                    value: `Fishing Level ${oldLevel} → ${player.fishingLevel}`,
                    inline: false
                });
            }

            // Create buttons
            const castAgainButton = new ButtonBuilder()
                .setCustomId(`cast_again_${location}`)
                .setLabel('Cast Again')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(player.rodDurability <= 0);

            const sellFishButton = new ButtonBuilder()
                .setCustomId('sell_fish')
                .setLabel('Sell Fish')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(castAgainButton, sellFishButton);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Error in cast command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fishing.',
                ephemeral: true
            });
        }
            equipment: { rod: 'Basic Rod' }
        };

        const fishingSpots = [
            {
                name: 'Village Pond',
                difficulty: 'Easy',
                catches: ['Common Fish', 'Old Boot', 'Small Coins'],
                energy: 10,
                emoji: '🏞️'
            },
            {
                name: 'Mystic Lake',
                difficulty: 'Medium',
                catches: ['Magic Fish', 'Water Crystals', 'Ancient Key'],
                energy: 20,
                emoji: '🌊'
            },
            {
                name: 'Crystal Springs',
                difficulty: 'Hard',
                catches: ['Crystal Fish', 'Rare Gems', 'Enchanted Items'],
                energy: 30,
                emoji: '💎'
            },
            {
                name: 'Abyssal Depths',
                difficulty: 'Legendary',
                catches: ['Deep Sea Monsters', 'Legendary Artifacts', 'Ancient Treasures'],
                energy: 50,
                emoji: '🌑'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🎣 Mystical Fishing Waters')
            .setDescription('**Cast your line and discover what lurks beneath!**\n\nDifferent waters hold different treasures.')
            .addFields(
                { name: '🎣 Fishing Level', value: `${userProfile.skills?.fishing || 1}`, inline: true },
                { name: '🎯 Current Rod', value: userProfile.equipment?.rod || 'Basic Rod', inline: true },
                { name: '⚡ Energy', value: '100/100', inline: true }
            );

        fishingSpots.forEach(spot => {
            const requiredLevel = spot.difficulty === 'Easy' ? 1 : spot.difficulty === 'Medium' ? 5 : spot.difficulty === 'Hard' ? 10 : 15;
            const canFish = (userProfile.skills?.fishing || 1) >= requiredLevel;
            const status = canFish ? '✅ Available' : `🔒 Requires Level ${requiredLevel}`;

            embed.addFields({
                name: `${spot.emoji} ${spot.name}`,
                value: `**Difficulty:** ${spot.difficulty}\n**Energy Cost:** ${spot.energy}\n**Possible Catches:** ${spot.catches.join(', ')}\n**Status:** ${status}`,
                inline: true
            });
        });

        const buttons = fishingSpots.map((spot, index) => 
            new ButtonBuilder()
                .setCustomId(`fish_cast_${index}`)
                .setLabel(`Fish at ${spot.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(spot.emoji)
        );

        const upgradeButton = new ButtonBuilder()
            .setCustomId('fishing_upgrade')
            .setLabel('Upgrade Fishing Rod')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔧');

        const baitButton = new ButtonBuilder()
            .setCustomId('fishing_bait')
            .setLabel('Buy Bait')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🪱');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(upgradeButton, baitButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};