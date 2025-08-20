const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

// Weather conditions and their effects
const weatherConditions = {
    clear: {
        name: 'Clear',
        emoji: '☀️',
        description: 'Perfect weather for outdoor activities!',
        effects: {
            foraging: '+20% item find rate',
            fishing: '+10% catch rate',
            farming: '+15% growth rate'
        }
    },
    cloudy: {
        name: 'Cloudy',
        emoji: '☁️',
        description: 'Mild conditions with occasional clouds.',
        effects: {
            foraging: '+10% item find rate',
            fishing: '+15% catch rate',
            farming: '+10% growth rate'
        }
    },
    rainy: {
        name: 'Rainy',
        emoji: '🌧️',
        description: 'Rain showers throughout the day.',
        effects: {
            foraging: '-10% item find rate',
            fishing: '+25% catch rate',
            farming: '+30% growth rate'
        }
    },
    stormy: {
        name: 'Stormy',
        emoji: '⛈️',
        description: 'Thunderstorms and strong winds.',
        effects: {
            foraging: '-20% item find rate',
            fishing: '+40% catch rate',
            farming: '-10% growth rate'
        }
    },
    foggy: {
        name: 'Foggy',
        emoji: '🌫️',
        description: 'Dense fog reduces visibility.',
        effects: {
            foraging: '-15% item find rate',
            fishing: '+5% catch rate',
            farming: '+5% growth rate'
        }
    },
    snowy: {
        name: 'Snowy',
        emoji: '🌨️',
        description: 'Snowfall and cold temperatures.',
        effects: {
            foraging: '-25% item find rate',
            fishing: '-10% catch rate',
            farming: '-20% growth rate'
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('🌤️ Check the current weather and forecast')
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('View current weather conditions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('forecast')
                .setDescription('View the weather forecast'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('effects')
                .setDescription('View how weather affects activities')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get or initialize server weather data
            let weatherData = await db.getWeather();
            if (!weatherData) {
                weatherData = {
                    current: 'clear',
                    forecast: [],
                    lastUpdate: Date.now()
                };
                await db.updateWeather(weatherData);
            }

            // Update weather every hour
            const hoursSinceUpdate = (Date.now() - weatherData.lastUpdate) / (60 * 60 * 1000);
            if (hoursSinceUpdate >= 1) {
                // Generate new weather
                const conditions = Object.keys(weatherConditions);
                weatherData.current = conditions[Math.floor(Math.random() * conditions.length)];
                
                // Generate forecast for next 6 hours
                weatherData.forecast = Array(6).fill().map(() => {
                    return conditions[Math.floor(Math.random() * conditions.length)];
                });

                weatherData.lastUpdate = Date.now();
                await db.updateWeather(weatherData);
            }

            if (subcommand === 'current') {
                const current = weatherConditions[weatherData.current];
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle(`${current.emoji} Current Weather`)
                    .setDescription(`**${current.name}**\n${current.description}`)
                    .addFields({
                        name: '🎯 Activity Effects',
                        value: Object.entries(current.effects)
                            .map(([activity, effect]) => `${activity}: ${effect}`)
                            .join('\n'),
                        inline: false
                    })
                    .setFooter({ text: `Last updated: ${new Date(weatherData.lastUpdate).toLocaleTimeString()}` });

                // Add next weather change countdown
                const nextUpdate = weatherData.lastUpdate + (60 * 60 * 1000);
                embed.addFields({
                    name: '⏳ Next Weather Change',
                    value: `<t:${Math.floor(nextUpdate / 1000)}:R>`,
                    inline: false
                });

                const refresh = new ButtonBuilder()
                    .setCustomId('weather_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const row = new ActionRowBuilder()
                    .addComponents(refresh);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'forecast') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🌤️ Weather Forecast')
                    .setDescription('Predicted weather conditions for the next 6 hours:');

                weatherData.forecast.forEach((condition, index) => {
                    const weather = weatherConditions[condition];
                    const time = new Date(weatherData.lastUpdate + ((index + 1) * 60 * 60 * 1000));
                    
                    embed.addFields({
                        name: `Hour ${index + 1} - ${time.toLocaleTimeString()}`,
                        value: `${weather.emoji} ${weather.name}\n${weather.description}`,
                        inline: true
                    });
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'effects') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📊 Weather Effects Guide')
                    .setDescription('How different weather conditions affect your activities:');

                Object.entries(weatherConditions).forEach(([condition, data]) => {
                    embed.addFields({
                        name: `${data.emoji} ${data.name}`,
                        value: Object.entries(data.effects)
                            .map(([activity, effect]) => `${activity}: ${effect}`)
                            .join('\n'),
                        inline: true
                    });
                });

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in weather command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while checking the weather.',
                ephemeral: true
            });
        }
    },
};
