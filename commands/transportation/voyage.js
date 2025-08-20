const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('travel')
        .setDescription('🗺️ Travel to different locations')
        .addSubcommand(subcommand =>
            subcommand
                .setName('explore')
                .setDescription('Travel to a new region')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Where to travel')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Forest Village', value: 'forest' },
                            { name: 'Mountain Pass', value: 'mountain' },
                            { name: 'Coastal Town', value: 'coast' },
                            { name: 'Desert Oasis', value: 'desert' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('map')
                .setDescription('View available locations and your current position')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize travel data if it doesn't exist
            if (!player.travel) {
                player.travel = {
                    currentLocation: 'town',
                    discoveredLocations: ['town'],
                    lastTravel: 0
                };
            }

            if (subcommand === 'explore') {
                const destination = interaction.options.getString('destination');
                const currentTime = Date.now();
                const travelCooldown = 300000; // 5 minutes

                if (currentTime - player.travel.lastTravel < travelCooldown) {
                    const remainingTime = Math.ceil((travelCooldown - (currentTime - player.travel.lastTravel)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You must rest for ${remainingTime} more minutes before traveling again.`,
                        ephemeral: true
                    });
                    return;
                }

                // Calculate travel costs based on distance and terrain
                const costs = {
                    forest: { gold: 50, stamina: 20 },
                    mountain: { gold: 100, stamina: 40 },
                    coast: { gold: 75, stamina: 30 },
                    desert: { gold: 150, stamina: 50 }
                };

                const cost = costs[destination];

                // Apply mount bonus if player has an active mount
                if (player.mounts?.active) {
                    const activeMount = player.mounts.owned.find(m => m.id === player.mounts.active);
                    if (activeMount && activeMount.stamina >= 10) {
                        cost.stamina = Math.floor(cost.stamina * 0.7); // 30% stamina reduction
                        cost.gold = Math.floor(cost.gold * 0.8); // 20% gold reduction
                    }
                }

                if (player.gold < cost.gold) {
                    await interaction.editReply({
                        content: `❌ You need ${cost.gold} gold to travel there!`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.stamina < cost.stamina) {
                    await interaction.editReply({
                        content: `❌ You need ${cost.stamina} stamina to travel there!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🗺️ Travel')
                    .setDescription(`Travel to ${destination}?`)
                    .addFields(
                        { name: 'Gold Cost', value: cost.gold.toString(), inline: true },
                        { name: 'Stamina Cost', value: cost.stamina.toString(), inline: true }
                    );

                const travel = new ButtonBuilder()
                    .setCustomId('travel_confirm')
                    .setLabel('Begin Journey')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗺️');

                const cancel = new ButtonBuilder()
                    .setCustomId('travel_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(travel, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'travel_confirm') {
                        player.gold -= cost.gold;
                        player.stamina -= cost.stamina;
                        player.travel.currentLocation = destination;
                        player.travel.lastTravel = currentTime;

                        if (!player.travel.discoveredLocations.includes(destination)) {
                            player.travel.discoveredLocations.push(destination);
                            // Bonus for discovering new location
                            player.experience += 50;
                        }

                        // Update mount stamina if used
                        if (player.mounts?.active) {
                            const activeMount = player.mounts.owned.find(m => m.id === player.mounts.active);
                            if (activeMount && activeMount.stamina >= 10) {
                                activeMount.stamina -= 10;
                            }
                        }

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🗺️ Journey Complete')
                            .setDescription(`You've arrived at ${destination}!`)
                            .addFields(
                                { name: 'Location', value: destination, inline: true },
                                { name: 'Remaining Gold', value: player.gold.toString(), inline: true },
                                { name: 'Remaining Stamina', value: player.stamina.toString(), inline: true }
                            );

                        if (!player.travel.discoveredLocations.includes(destination)) {
                            successEmbed.addFields({
                                name: '🌟 New Discovery!',
                                value: 'You\'ve discovered a new location! (+50 XP)',
                                inline: false
                            });
                        }

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Journey cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Journey request expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'map') {
                const locations = {
                    town: '🏰 Central Town',
                    forest: '🌲 Forest Village',
                    mountain: '⛰️ Mountain Pass',
                    coast: '🌊 Coastal Town',
                    desert: '🏜️ Desert Oasis'
                };

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🗺️ World Map')
                    .setDescription('Here are all the locations you can visit:');

                let locationsList = '';
                Object.entries(locations).forEach(([id, name]) => {
                    if (player.travel.discoveredLocations.includes(id)) {
                        locationsList += `${name} ${id === player.travel.currentLocation ? '(You are here)' : ''}\n`;
                    } else {
                        locationsList += '❓ Unknown Location\n';
                    }
                });

                embed.addFields({
                    name: '📍 Locations',
                    value: locationsList,
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in travel command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while traveling.',
                ephemeral: true
            });
        }
    },
};
