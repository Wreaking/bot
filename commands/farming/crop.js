const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('🌾 Manage your farm and crops')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plot')
                .setDescription('Purchase or view your farming plots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Plant seeds in your plots')
                .addStringOption(option =>
                    option.setName('seed')
                        .setDescription('Type of seed to plant')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌾 Wheat', value: 'wheat' },
                            { name: '🥕 Carrot', value: 'carrot' },
                            { name: '🥔 Potato', value: 'potato' },
                            { name: '🍅 Tomato', value: 'tomato' },
                            { name: '🌿 Herbs', value: 'herbs' },
                            { name: '🌸 Magic Flower', value: 'magic_flower' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('water')
                .setDescription('Water your crops')
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to water')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Harvest ready crops')
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to harvest')
                        .setRequired(true))),

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

            // Initialize farming data if it doesn't exist
            if (!player.farming) {
                player.farming = {
                    plots: [],
                    experience: 0,
                    lastWater: 0,
                    harvests: 0,
                    achievements: []
                };
            }

            const crops = {
                wheat: {
                    name: 'Wheat',
                    emoji: '🌾',
                    growthTime: 1800000, // 30 minutes
                    waterNeeded: 2,
                    seedCost: 50,
                    baseYield: { min: 3, max: 6 },
                    experience: 20
                },
                carrot: {
                    name: 'Carrot',
                    emoji: '🥕',
                    growthTime: 3600000, // 1 hour
                    waterNeeded: 3,
                    seedCost: 75,
                    baseYield: { min: 4, max: 8 },
                    experience: 30
                },
                potato: {
                    name: 'Potato',
                    emoji: '🥔',
                    growthTime: 5400000, // 1.5 hours
                    waterNeeded: 4,
                    seedCost: 100,
                    baseYield: { min: 5, max: 10 },
                    experience: 40
                },
                tomato: {
                    name: 'Tomato',
                    emoji: '🍅',
                    growthTime: 7200000, // 2 hours
                    waterNeeded: 5,
                    seedCost: 150,
                    baseYield: { min: 6, max: 12 },
                    experience: 50
                },
                herbs: {
                    name: 'Herbs',
                    emoji: '🌿',
                    growthTime: 10800000, // 3 hours
                    waterNeeded: 6,
                    seedCost: 200,
                    baseYield: { min: 2, max: 5 },
                    experience: 75
                },
                magic_flower: {
                    name: 'Magic Flower',
                    emoji: '🌸',
                    growthTime: 21600000, // 6 hours
                    waterNeeded: 8,
                    seedCost: 500,
                    baseYield: { min: 1, max: 3 },
                    experience: 150
                }
            };

            if (subcommand === 'plot') {
                const plotCost = Math.floor(1000 * Math.pow(1.5, player.farming.plots.length));
                const maxPlots = Math.floor(player.level / 5) + 1;

                if (player.farming.plots.length >= maxPlots) {
                    await interaction.editReply({
                        content: `❌ You need to be level ${(player.farming.plots.length + 1) * 5} to buy more plots!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🌾 Farming Plots')
                    .setDescription('Your farming empire:')
                    .addFields(
                        { name: '🏡 Current Plots', value: player.farming.plots.length.toString(), inline: true },
                        { name: '🔓 Max Plots', value: maxPlots.toString(), inline: true },
                        { name: '💰 Next Plot Cost', value: plotCost.toString(), inline: true }
                    );

                // Show plot status
                if (player.farming.plots.length > 0) {
                    player.farming.plots.forEach((plot, index) => {
                        const status = plot.crop ? 
                            `${crops[plot.crop].emoji} Growing ${crops[plot.crop].name}\nWater: ${plot.water}/${crops[plot.crop].waterNeeded}\nProgress: ${this.getGrowthProgress(plot)}` :
                            'Empty plot (ready for planting)';

                        embed.addFields({
                            name: `Plot ${index + 1}`,
                            value: status,
                            inline: true
                        });
                    });
                }

                // Add purchase button if player can afford a new plot
                const components = [];
                if (player.gold >= plotCost && player.farming.plots.length < maxPlots) {
                    const purchase = new ButtonBuilder()
                        .setCustomId('plot_purchase')
                        .setLabel(`Buy Plot (${plotCost} gold)`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏡');

                    components.push(new ActionRowBuilder().addComponents(purchase));
                }

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: components
                });

                if (components.length > 0) {
                    const filter = i => i.user.id === interaction.user.id;
                    try {
                        const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                        if (confirmation.customId === 'plot_purchase') {
                            if (player.gold < plotCost) {
                                await confirmation.update({
                                    content: '❌ Not enough gold!',
                                    embeds: [],
                                    components: []
                                });
                                return;
                            }

                            player.gold -= plotCost;
                            player.farming.plots.push({
                                crop: null,
                                water: 0,
                                plantedAt: null,
                                health: 100
                            });

                            await db.updatePlayer(userId, player);

                            const successEmbed = new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('🏡 Plot Purchased!')
                                .setDescription(`You now own ${player.farming.plots.length} plots!`)
                                .addFields(
                                    { name: 'Plot Number', value: player.farming.plots.length.toString(), inline: true },
                                    { name: 'Gold Spent', value: plotCost.toString(), inline: true },
                                    { name: 'Remaining Gold', value: player.gold.toString(), inline: true }
                                );

                            await confirmation.update({
                                embeds: [successEmbed],
                                components: []
                            });
                        }
                    } catch (e) {
                        await interaction.editReply({
                            content: '❌ Purchase cancelled.',
                            embeds: [embed],
                            components: []
                        });
                    }
                }

            } else if (subcommand === 'plant') {
                const seed = interaction.options.getString('seed');
                const crop = crops[seed];

                if (player.farming.plots.length === 0) {
                    await interaction.editReply({
                        content: '❌ You don\'t own any farming plots! Use `/farm plot` to buy one.',
                        ephemeral: true
                    });
                    return;
                }

                if (player.gold < crop.seedCost) {
                    await interaction.editReply({
                        content: `❌ You need ${crop.seedCost} gold to buy ${crop.name} seeds!`,
                        ephemeral: true
                    });
                    return;
                }

                // Find empty plot
                const emptyPlotIndex = player.farming.plots.findIndex(plot => !plot.crop);
                if (emptyPlotIndex === -1) {
                    await interaction.editReply({
                        content: '❌ All your plots are occupied! Wait for crops to grow or buy more plots.',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🌱 Plant Seeds')
                    .setDescription(`Plant ${crop.emoji} ${crop.name} seeds in plot ${emptyPlotIndex + 1}?`)
                    .addFields(
                        { name: 'Cost', value: crop.seedCost.toString(), inline: true },
                        { name: 'Growth Time', value: this.formatTime(crop.growthTime), inline: true },
                        { name: 'Water Needed', value: crop.waterNeeded.toString(), inline: true }
                    );

                const plant = new ButtonBuilder()
                    .setCustomId('seed_plant')
                    .setLabel('Plant Seeds')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱');

                const cancel = new ButtonBuilder()
                    .setCustomId('seed_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(plant, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'seed_plant') {
                        player.gold -= crop.seedCost;
                        player.farming.plots[emptyPlotIndex] = {
                            crop: seed,
                            water: 0,
                            plantedAt: Date.now(),
                            health: 100
                        };

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🌱 Seeds Planted!')
                            .setDescription(`You've planted ${crop.emoji} ${crop.name} seeds!`)
                            .addFields(
                                { name: 'Plot', value: (emptyPlotIndex + 1).toString(), inline: true },
                                { name: 'Water Needed', value: `0/${crop.waterNeeded}`, inline: true },
                                { name: 'Ready In', value: this.formatTime(crop.growthTime), inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Planting cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Planting request expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'water') {
                const plotIndex = interaction.options.getInteger('plot') - 1;
                const currentTime = Date.now();
                const waterCooldown = 300000; // 5 minutes

                if (plotIndex < 0 || plotIndex >= player.farming.plots.length) {
                    await interaction.editReply({
                        content: '❌ Invalid plot number!',
                        ephemeral: true
                    });
                    return;
                }

                const plot = player.farming.plots[plotIndex];
                if (!plot.crop) {
                    await interaction.editReply({
                        content: '❌ This plot has no crops to water!',
                        ephemeral: true
                    });
                    return;
                }

                if (currentTime - player.farming.lastWater < waterCooldown) {
                    const remainingTime = Math.ceil((waterCooldown - (currentTime - player.farming.lastWater)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You must wait ${remainingTime} more minutes before watering again.`,
                        ephemeral: true
                    });
                    return;
                }

                const crop = crops[plot.crop];
                if (plot.water >= crop.waterNeeded) {
                    await interaction.editReply({
                        content: '❌ This crop has enough water!',
                        ephemeral: true
                    });
                    return;
                }

                player.farming.lastWater = currentTime;
                plot.water += 1;
                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('💧 Watering Complete')
                    .setDescription(`You watered your ${crop.emoji} ${crop.name}!`)
                    .addFields(
                        { name: 'Plot', value: (plotIndex + 1).toString(), inline: true },
                        { name: 'Water Level', value: `${plot.water}/${crop.waterNeeded}`, inline: true },
                        { name: 'Growth Progress', value: this.getGrowthProgress(plot), inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'harvest') {
                const plotIndex = interaction.options.getInteger('plot') - 1;

                if (plotIndex < 0 || plotIndex >= player.farming.plots.length) {
                    await interaction.editReply({
                        content: '❌ Invalid plot number!',
                        ephemeral: true
                    });
                    return;
                }

                const plot = player.farming.plots[plotIndex];
                if (!plot.crop) {
                    await interaction.editReply({
                        content: '❌ This plot has no crops to harvest!',
                        ephemeral: true
                    });
                    return;
                }

                const crop = crops[plot.crop];
                const growthTime = currentTime - plot.plantedAt;
                if (growthTime < crop.growthTime || plot.water < crop.waterNeeded) {
                    await interaction.editReply({
                        content: `❌ The ${crop.name} isn't ready to harvest!\n${this.getGrowthProgress(plot)}`,
                        ephemeral: true
                    });
                    return;
                }

                // Calculate harvest yield based on care and timing
                const waterBonus = plot.water > crop.waterNeeded ? 0.2 : 0;
                const timeBonus = growthTime < crop.growthTime * 1.1 ? 0.1 : 0;
                const levelBonus = Math.floor(player.farming.experience / 100) * 0.05;
                const totalBonus = 1 + waterBonus + timeBonus + levelBonus;

                const baseYield = Math.floor(Math.random() * (crop.baseYield.max - crop.baseYield.min + 1)) + crop.baseYield.min;
                const yield = Math.floor(baseYield * totalBonus);

                // Add to inventory
                player.inventory.materials = player.inventory.materials || {};
                player.inventory.materials[plot.crop] = (player.inventory.materials[plot.crop] || 0) + yield;

                // Award experience
                player.farming.experience += crop.experience;
                player.farming.harvests += 1;

                // Clear plot
                player.farming.plots[plotIndex] = {
                    crop: null,
                    water: 0,
                    plantedAt: null,
                    health: 100
                };

                // Check for achievements
                if (player.farming.harvests === 10) {
                    player.farming.achievements.push('Novice Farmer');
                } else if (player.farming.harvests === 50) {
                    player.farming.achievements.push('Skilled Farmer');
                } else if (player.farming.harvests === 100) {
                    player.farming.achievements.push('Master Farmer');
                }

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🌾 Harvest Complete!')
                    .setDescription(`You harvested ${yield}x ${crop.emoji} ${crop.name}!`)
                    .addFields(
                        { name: 'Base Yield', value: baseYield.toString(), inline: true },
                        { name: 'Bonus Yield', value: `+${Math.floor((totalBonus - 1) * 100)}%`, inline: true },
                        { name: 'Experience', value: `+${crop.experience}`, inline: true },
                        { name: 'Farming Level', value: `${Math.floor(player.farming.experience / 100) + 1}`, inline: true },
                        { name: 'Total Harvests', value: player.farming.harvests.toString(), inline: true }
                    );

                if (player.farming.achievements.length > 0) {
                    embed.addFields({
                        name: '🏆 Achievements',
                        value: player.farming.achievements.join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in farm command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while farming.',
                ephemeral: true
            });
        }
    },

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h${remainingMinutes}m`;
    },

    getGrowthProgress(plot) {
        if (!plot.crop) return 'Empty plot';
        
        const crop = crops[plot.crop];
        const currentTime = Date.now();
        const growthTime = currentTime - plot.plantedAt;
        const progress = Math.min(100, Math.floor((growthTime / crop.growthTime) * 100));
        
        const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
        return `${progressBar} ${progress}%`;
    }
};
