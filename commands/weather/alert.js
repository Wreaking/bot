const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

// Disaster types and their effects
const disasters = {
    tornado: {
        name: 'Tornado',
        emoji: '🌪️',
        description: 'A powerful twister approaches!',
        duration: 30 * 60 * 1000, // 30 minutes
        effects: {
            foraging: 'Disabled',
            fishing: 'Disabled',
            farming: '-50% growth rate',
            damage: 'High'
        },
        preparation: [
            'Board up windows',
            'Move to shelter',
            'Secure loose items'
        ]
    },
    flood: {
        name: 'Flood',
        emoji: '🌊',
        description: 'Rising water levels threaten the area!',
        duration: 60 * 60 * 1000, // 1 hour
        effects: {
            foraging: '-80% item find rate',
            fishing: '+100% catch rate',
            farming: '-100% growth rate',
            damage: 'Medium'
        },
        preparation: [
            'Move to higher ground',
            'Sandbag important areas',
            'Secure valuables'
        ]
    },
    heatwave: {
        name: 'Heatwave',
        emoji: '🌡️',
        description: 'Extreme temperatures incoming!',
        duration: 120 * 60 * 1000, // 2 hours
        effects: {
            foraging: '-50% item find rate',
            fishing: '-30% catch rate',
            farming: '-70% growth rate',
            damage: 'Low'
        },
        preparation: [
            'Water crops frequently',
            'Set up shade structures',
            'Prepare cooling stations'
        ]
    },
    blizzard: {
        name: 'Blizzard',
        emoji: '🌨️',
        description: 'A severe snowstorm approaches!',
        duration: 45 * 60 * 1000, // 45 minutes
        effects: {
            foraging: 'Disabled',
            fishing: '-50% catch rate',
            farming: '-90% growth rate',
            damage: 'Medium'
        },
        preparation: [
            'Insulate crops',
            'Stock up supplies',
            'Clear snow regularly'
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('⚠️ Weather alerts and warnings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check current weather alerts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('prepare')
                .setDescription('Get preparation advice for incoming weather events'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('damage')
                .setDescription('View weather damage report')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get weather alert data
            let alertData = await db.getWeatherAlerts();
            if (!alertData) {
                alertData = {
                    active: null,
                    lastDisaster: null,
                    damage: {},
                    preparations: {}
                };
                await db.updateWeatherAlerts(alertData);
            }

            // Random chance to trigger new disaster if none active
            if (!alertData.active && Math.random() < 0.1) { // 10% chance
                const possibleDisasters = Object.keys(disasters);
                alertData.active = {
                    type: possibleDisasters[Math.floor(Math.random() * possibleDisasters.length)],
                    start: Date.now(),
                    warning: true
                };
                await db.updateWeatherAlerts(alertData);
            }

            if (subcommand === 'check') {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⚠️ Weather Alert Status');

                if (alertData.active) {
                    const disaster = disasters[alertData.active.type];
                    const timeLeft = (alertData.active.start + disaster.duration) - Date.now();

                    if (timeLeft <= 0) {
                        // Disaster has ended
                        alertData.lastDisaster = alertData.active;
                        alertData.active = null;
                        await db.updateWeatherAlerts(alertData);

                        embed.setColor('#00FF00')
                            .setDescription('✅ All clear! No active weather alerts.')
                            .addFields({
                                name: '🕒 Last Event',
                                value: `${disaster.emoji} ${disaster.name} (Ended <t:${Math.floor(Date.now() / 1000)}:R>)`,
                                inline: false
                            });
                    } else {
                        // Active disaster
                        embed.setDescription(`${disaster.emoji} **${disaster.name}** - ${disaster.description}`)
                            .addFields(
                                { name: '⏳ Time Remaining', value: `<t:${Math.floor((alertData.active.start + disaster.duration) / 1000)}:R>`, inline: true },
                                { name: '🎯 Active Effects', value: Object.entries(disaster.effects)
                                    .map(([activity, effect]) => `${activity}: ${effect}`)
                                    .join('\n'), inline: false }
                            );

                        if (alertData.active.warning) {
                            embed.addFields({
                                name: '⚠️ Preparation Time',
                                value: 'You still have time to prepare! Use `/alert prepare` to see what you can do.',
                                inline: false
                            });
                        }
                    }
                } else {
                    embed.setColor('#00FF00')
                        .setDescription('✅ All clear! No active weather alerts.');
                }

                const refresh = new ButtonBuilder()
                    .setCustomId('alert_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const row = new ActionRowBuilder()
                    .addComponents(refresh);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'prepare') {
                if (!alertData.active || !alertData.active.warning) {
                    await interaction.editReply({
                        content: '✅ No incoming weather events to prepare for!',
                        ephemeral: true
                    });
                    return;
                }

                const disaster = disasters[alertData.active.type];
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`${disaster.emoji} Preparation Guide: ${disaster.name}`)
                    .setDescription('Take these actions to minimize damage:');

                disaster.preparation.forEach((step, index) => {
                    const prepared = alertData.preparations[userId]?.[alertData.active.type]?.[index] || false;
                    embed.addFields({
                        name: `Step ${index + 1}`,
                        value: `${prepared ? '✅' : '⬜'} ${step}`,
                        inline: false
                    });
                });

                const buttons = disaster.preparation.map((_, index) => {
                    return new ButtonBuilder()
                        .setCustomId(`prepare_${index}`)
                        .setLabel(`Complete Step ${index + 1}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(alertData.preparations[userId]?.[alertData.active.type]?.[index] || false);
                });

                const row = new ActionRowBuilder()
                    .addComponents(buttons);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'damage') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📊 Weather Damage Report');

                if (alertData.lastDisaster) {
                    const disaster = disasters[alertData.lastDisaster.type];
                    embed.setDescription(`Last Event: ${disaster.emoji} ${disaster.name}`)
                        .addFields(
                            { name: '📅 Occurred', value: `<t:${Math.floor(alertData.lastDisaster.start / 1000)}:R>`, inline: true },
                            { name: '💫 Effects', value: Object.entries(disaster.effects)
                                .map(([activity, effect]) => `${activity}: ${effect}`)
                                .join('\n'), inline: false }
                        );

                    if (alertData.damage[userId]) {
                        embed.addFields({
                            name: '💔 Your Losses',
                            value: Object.entries(alertData.damage[userId])
                                .map(([type, amount]) => `${type}: ${amount}`)
                                .join('\n'),
                            inline: false
                        });
                    } else {
                        embed.addFields({
                            name: '✨ No Damage',
                            value: 'You successfully avoided any losses!',
                            inline: false
                        });
                    }
                } else {
                    embed.setDescription('No recent weather events to report.');
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in alert command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while checking weather alerts.',
                ephemeral: true
            });
        }
    },
};
