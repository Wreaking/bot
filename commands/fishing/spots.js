const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Locations and their fish varieties
const locations = {
    coast: {
        name: 'Coastal Waters',
        emoji: '🌊',
        fish: [
            { name: 'Sardine', rarity: 'common', value: 3 },
            { name: 'Anchovy', rarity: 'common', value: 4 },
            { name: 'Mackerel', rarity: 'common', value: 5 }
        ],
        level: 1
    },
    lake: {
        name: 'Freshwater Lake',
        emoji: '🏞️',
        fish: [
            { name: 'Bass', rarity: 'common', value: 6 },
            { name: 'Trout', rarity: 'uncommon', value: 12 },
            { name: 'Catfish', rarity: 'rare', value: 25 }
        ],
        level: 5
    },
    river: {
        name: 'Rushing River',
        emoji: '🌊',
        fish: [
            { name: 'Salmon', rarity: 'uncommon', value: 15 },
            { name: 'Sturgeon', rarity: 'rare', value: 30 },
            { name: 'Golden Trout', rarity: 'legendary', value: 100 }
        ],
        level: 10
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spots')
        .setDescription('🗺️ Discover and manage fishing spots')
        .addSubcommand(subcommand =>
            subcommand
                .setName('discover')
                .setDescription('Search for new fishing spots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your discovered fishing spots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('favorite')
                .setDescription('Mark a fishing spot as your favorite')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                discoveredSpots: ['coast'],
                favoriteSpot: 'coast',
                equipment: {
                    rod: 'wooden_rod',
                    bait: [],
                    accessories: []
                }
            };

            if (subcommand === 'discover') {
                const chance = Math.random();
                let newSpot = null;
                
                // Higher level players have better chances
                if (player.fishingLevel >= 10 && chance > 0.7) {
                    newSpot = 'river';
                } else if (player.fishingLevel >= 5 && chance > 0.5) {
                    newSpot = 'lake';
                }

                if (!newSpot || player.discoveredSpots.includes(newSpot)) {
                    await interaction.editReply({
                        content: '❌ Your exploration revealed no new fishing spots this time.',
                        ephemeral: true
                    });
                    return;
                }

                player.discoveredSpots.push(newSpot);
                await db.updatePlayer(userId, player);

                const location = locations[newSpot];
                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('🗺️ New Fishing Spot Discovered!')
                    .setDescription(`You've discovered ${location.emoji} **${location.name}**!`)
                    .addFields(
                        { name: 'Level Required', value: location.level.toString(), inline: true },
                        { name: 'Fish Variety', value: location.fish.length.toString(), inline: true },
                        { name: 'Potential Catches', value: location.fish.map(f => f.name).join(', '), inline: false }
                    );

                const viewButton = new ButtonBuilder()
                    .setCustomId(`view_spot_${newSpot}`)
                    .setLabel('View Details')
                    .setStyle(ButtonStyle.Primary);

                const favoriteButton = new ButtonBuilder()
                    .setCustomId(`favorite_spot_${newSpot}`)
                    .setLabel('Set as Favorite')
                    .setStyle(ButtonStyle.Success);

                const row = new ActionRowBuilder()
                    .addComponents(viewButton, favoriteButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'view') {
                if (player.discoveredSpots.length === 0) {
                    await interaction.editReply({
                        content: '❌ You haven\'t discovered any fishing spots yet!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🗺️ Your Fishing Spots')
                    .setDescription('Here are all the fishing spots you\'ve discovered:');

                player.discoveredSpots.forEach(spotId => {
                    const spot = locations[spotId];
                    const isFavorite = player.favoriteSpot === spotId;
                    embed.addFields({
                        name: `${spot.emoji} ${spot.name} ${isFavorite ? '⭐' : ''}`,
                        value: `Level ${spot.level}\nFish: ${spot.fish.map(f => f.name).join(', ')}`,
                        inline: false
                    });
                });

                const buttons = player.discoveredSpots.map(spotId => {
                    const spot = locations[spotId];
                    return new ButtonBuilder()
                        .setCustomId(`teleport_${spotId}`)
                        .setLabel(`Go to ${spot.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(spot.emoji);
                });

                // Split buttons into rows of 3
                const rows = [];
                for (let i = 0; i < buttons.length; i += 3) {
                    rows.push(
                        new ActionRowBuilder()
                            .addComponents(buttons.slice(i, i + 3))
                    );
                }

                await interaction.editReply({
                    embeds: [embed],
                    components: rows
                });

            } else if (subcommand === 'favorite') {
                if (player.discoveredSpots.length === 0) {
                    await interaction.editReply({
                        content: '❌ You need to discover fishing spots first!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('⭐ Set Favorite Fishing Spot')
                    .setDescription('Choose your preferred fishing spot:');

                const buttons = player.discoveredSpots.map(spotId => {
                    const spot = locations[spotId];
                    const isFavorite = player.favoriteSpot === spotId;
                    return new ButtonBuilder()
                        .setCustomId(`favorite_${spotId}`)
                        .setLabel(spot.name)
                        .setStyle(isFavorite ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(spot.emoji);
                });

                const row = new ActionRowBuilder()
                    .addComponents(buttons);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Error in spots command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing fishing spots.',
                ephemeral: true
            });
        }
    },
};
