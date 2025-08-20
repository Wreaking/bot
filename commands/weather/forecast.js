
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Weather data with enhanced effects
const WEATHER_TYPES = {
    sunny: { 
        name: 'Sunny Skies', 
        emoji: '☀️', 
        effect: '+20% treasure find rate', 
        description: 'Perfect weather for exploring! The sun illuminates hidden treasures.',
        color: '#FFD700',
        bonuses: { treasure_chance: 20, exploration: 15 }
    },
    foggy: { 
        name: 'Mystic Fog', 
        emoji: '🌫️', 
        effect: '+15% rare item chance', 
        description: 'Magical mist reveals hidden secrets and rare artifacts...',
        color: '#708090',
        bonuses: { rare_chance: 15, mystery: 10 }
    },
    stormy: { 
        name: 'Thunderstorm', 
        emoji: '⛈️', 
        effect: '-10% safety, +25% XP from combat', 
        description: 'Dangerous but rewarding adventures! Lightning empowers warriors.',
        color: '#4B0082',
        bonuses: { combat_xp: 25, danger: -10 }
    },
    aurora: { 
        name: 'Aurora Night', 
        emoji: '🌌', 
        effect: '+30% magic item discovery', 
        description: 'Ancient magic flows through the air, revealing mystical treasures...',
        color: '#00CED1',
        bonuses: { magic_items: 30, mana_regen: 20 }
    },
    crystal_rain: { 
        name: 'Crystal Rain', 
        emoji: '💎', 
        effect: '+50% gem finding rate', 
        description: 'Precious stones fall from the sky like divine gifts!',
        color: '#9932CC',
        bonuses: { gem_chance: 50, crystal_growth: 25 }
    },
    blood_moon: {
        name: 'Blood Moon',
        emoji: '🌙',
        effect: '+100% rare monster spawns',
        description: 'The crimson moon awakens ancient evils and legendary beasts...',
        color: '#8B0000',
        bonuses: { rare_monsters: 100, combat_danger: 50 }
    },
    golden_hour: {
        name: 'Golden Hour',
        emoji: '🌅',
        effect: '+35% all rewards',
        description: 'The perfect time when everything seems more valuable and achievable.',
        color: '#DAA520',
        bonuses: { all_rewards: 35, luck: 15 }
    }
};

const WEATHER_LOCATIONS = [
    { name: 'Mystic Forest', weather: '🌲 Ancient Whispers', effect: '+15% herb gathering', color: '#228B22' },
    { name: 'Crystal Caves', weather: '⚡ Electric Storms', effect: '+20% crystal formation', color: '#4169E1' },
    { name: 'Dragon\'s Peak', weather: '🔥 Volcanic Activity', effect: '+25% rare metals', color: '#FF4500' },
    { name: 'Frozen Tundra', weather: '❄️ Eternal Winter', effect: '+30% ice crystals', color: '#B0E0E6' },
    { name: 'Desert Oasis', weather: '🏜️ Sandstorm Veil', effect: '+40% ancient artifacts', color: '#DEB887' },
    { name: 'Underwater Realm', weather: '🌊 Tidal Surge', effect: '+35% sea treasures', color: '#008B8B' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('🌤️ Check the mystical weather affecting treasure hunting')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Specific location to check weather for')
                .setRequired(false)
                .addChoices(
                    ...WEATHER_LOCATIONS.map(loc => ({ name: loc.name, value: loc.name.toLowerCase().replace(/[^a-z0-9]/g, '_') }))
                )),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const requestedLocation = interaction.options.getString('location');
        
        let userProfile = await db.get(`user_${userId}`) || {
            location: 'Village Square',
            weather_alerts: true,
            weather_protection: 0
        };

        // Generate current and upcoming weather
        const weatherKeys = Object.keys(WEATHER_TYPES);
        const currentWeatherKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
        const nextWeatherKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
        
        const currentWeather = WEATHER_TYPES[currentWeatherKey];
        const nextWeather = WEATHER_TYPES[nextWeatherKey];

        // Weather intensity (affects bonuses)
        const intensity = Math.random() * 0.5 + 0.75; // 0.75 to 1.25 multiplier
        const intensityText = intensity > 1.1 ? ' 🔥 **INTENSE**' : intensity < 0.9 ? ' 💨 *Mild*' : '';

        const embed = new EmbedBuilder()
            .setColor(currentWeather.color)
            .setTitle('🌤️ Mystical Weather Observatory')
            .setDescription('**The Arcane Atmosphere influences all adventures and discoveries!**')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/weather-icon.png')
            .addFields(
                { 
                    name: '📍 Current Location', 
                    value: `**${userProfile.location || 'Village Square'}**\n🕐 ${new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', timeStyle: 'short' })} UTC`, 
                    inline: true 
                },
                { 
                    name: '🛡️ Weather Protection', 
                    value: `Level ${userProfile.weather_protection || 0}\n${userProfile.weather_protection > 0 ? '✅ Active' : '❌ None'}`, 
                    inline: true 
                },
                { 
                    name: '🔔 Alerts', 
                    value: userProfile.weather_alerts ? '✅ Enabled' : '❌ Disabled', 
                    inline: true 
                }
            );

        // Current weather section
        const currentBonuses = Object.entries(currentWeather.bonuses || {})
            .map(([key, value]) => `${value > 0 ? '+' : ''}${Math.floor(value * intensity)}% ${key.replace('_', ' ')}`)
            .join('\n');

        embed.addFields({
            name: `${currentWeather.emoji} **Current Weather: ${currentWeather.name}**${intensityText}`,
            value: `**Primary Effect:** ${currentWeather.effect}\n**Bonuses:**\n${currentBonuses}\n\n*${currentWeather.description}*`,
            inline: false
        });

        // Weather forecast
        const forecastHours = [2, 4, 6, 12];
        const forecastData = forecastHours.map(hours => {
            const weatherKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
            const weather = WEATHER_TYPES[weatherKey];
            return `**In ${hours}h:** ${weather.emoji} ${weather.name}`;
        }).join('\n');

        embed.addFields({
            name: '🔮 Weather Forecast',
            value: forecastData,
            inline: true
        });

        // Regional weather
        const regionalWeather = WEATHER_LOCATIONS.slice(0, 4).map(location => {
            const weather = WEATHER_LOCATIONS[Math.floor(Math.random() * WEATHER_LOCATIONS.length)];
            return `**${location.name}:**\n${weather.weather}\n*${weather.effect}*`;
        }).join('\n\n');

        embed.addFields({
            name: '🗺️ Regional Conditions',
            value: regionalWeather,
            inline: true
        });

        // Weather effects on activities
        embed.addFields({
            name: '⚡ Activity Effects',
            value: `🏴‍☠️ **Treasure Hunting:** ${currentWeather.bonuses.treasure_chance || 0 > 0 ? '📈 Enhanced' : '📉 Normal'}\n🏛️ **Exploration:** ${currentWeather.bonuses.exploration || 0 > 0 ? '📈 Boosted' : '📉 Standard'}\n⚔️ **Combat:** ${currentWeather.bonuses.combat_xp || 0 > 0 ? '📈 Rewarding' : '📉 Risky'}\n🔮 **Magic:** ${currentWeather.bonuses.magic_items || 0 > 0 ? '📈 Amplified' : '📉 Stable'}`,
            inline: false
        });

        // Weather warnings
        let warningText = '';
        if (currentWeather.bonuses.danger && currentWeather.bonuses.danger < 0) {
            warningText = '⚠️ **WARNING:** Dangerous conditions detected! Consider weather protection.';
        } else if (currentWeather.bonuses.rare_monsters && currentWeather.bonuses.rare_monsters > 0) {
            warningText = '🚨 **ALERT:** Increased monster activity reported!';
        }

        if (warningText) {
            embed.addFields({ name: '🚨 Weather Alerts', value: warningText, inline: false });
        }

        // Create interactive buttons
        const weatherButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('weather_refresh')
                    .setLabel('🔄 Refresh Weather')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('weather_forecast_detailed')
                    .setLabel('📊 Detailed Forecast')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('weather_protection')
                    .setLabel('🛡️ Weather Protection')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('weather_alerts_toggle')
                    .setLabel(userProfile.weather_alerts ? '🔕 Disable Alerts' : '🔔 Enable Alerts')
                    .setStyle(userProfile.weather_alerts ? ButtonStyle.Danger : ButtonStyle.Success)
            );

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('weather_location_select')
            .setPlaceholder('🗺️ Check weather in different locations...')
            .addOptions([
                {
                    label: 'Village Square',
                    description: 'Safe starting area with mild weather',
                    value: 'village_square',
                    emoji: '🏘️'
                },
                ...WEATHER_LOCATIONS.map((loc, index) => ({
                    label: loc.name,
                    description: `${loc.effect} - Current: ${loc.weather}`,
                    value: loc.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    emoji: ['🌲', '💎', '🏔️', '❄️', '🏜️', '🌊'][index] || '📍'
                }))
            ]);

        const weatherActions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('weather_ritual')
                    .setLabel('🔮 Weather Ritual')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('weather_travel')
                    .setLabel('🚀 Fast Travel')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('weather_gear')
                    .setLabel('🎒 Weather Gear')
                    .setStyle(ButtonStyle.Success)
            );

        embed.setFooter({ 
            text: `Weather updates every 30 minutes • Next update in ${30 - new Date().getMinutes() % 30} minutes • Intensity: ${Math.floor(intensity * 100)}%`,
            iconURL: 'https://cdn.discordapp.com/attachments/123456789/weather-footer.png'
        });

        const components = [
            new ActionRowBuilder().addComponents(locationSelect),
            weatherButtons,
            weatherActions
        ];

        await interaction.reply({ embeds: [embed], components });
    }
};
