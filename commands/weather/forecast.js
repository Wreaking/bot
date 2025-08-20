const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('🌤️ Check the mystical weather affecting treasure hunting'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            location: 'Village Square'
        };

        const weatherTypes = [
            { 
                type: 'Sunny Skies', 
                emoji: '☀️', 
                effect: '+20% treasure find rate', 
                description: 'Perfect weather for exploring!',
                color: '#FFD700'
            },
            { 
                type: 'Mystic Fog', 
                emoji: '🌫️', 
                effect: '+15% rare item chance', 
                description: 'Magical mist reveals hidden secrets...',
                color: '#708090'
            },
            { 
                type: 'Thunderstorm', 
                emoji: '⛈️', 
                effect: '-10% safety, +25% XP from combat', 
                description: 'Dangerous but rewarding adventures!',
                color: '#4B0082'
            },
            { 
                type: 'Aurora Night', 
                emoji: '🌌', 
                effect: '+30% magic item discovery', 
                description: 'Ancient magic flows through the air...',
                color: '#00CED1'
            },
            { 
                type: 'Crystal Rain', 
                emoji: '💎', 
                effect: '+50% gem finding rate', 
                description: 'Precious stones fall from the sky!',
                color: '#9932CC'
            }
        ];

        const currentWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const nextWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

        const embed = new EmbedBuilder()
            .setColor(currentWeather.color)
            .setTitle('🌤️ Mystical Weather Report')
            .setDescription('**The Arcane Atmosphere affects all treasure hunting activities!**')
            .addFields(
                { name: '📍 Location', value: userProfile.location || 'Village Square', inline: true },
                { name: '🕐 Current Time', value: new Date().toLocaleTimeString(), inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                {
                    name: `${currentWeather.emoji} Current Weather: ${currentWeather.type}`,
                    value: `**Effect:** ${currentWeather.effect}\n**Description:** ${currentWeather.description}`,
                    inline: false
                },
                {
                    name: `🔮 Next Weather: ${nextWeather.type} ${nextWeather.emoji}`,
                    value: `Changes in 2 hours\n**Effect:** ${nextWeather.effect}`,
                    inline: false
                }
            );

        // Add weather forecast for different locations
        const forecast = [
            { location: 'Mystic Forest', weather: '🌲 Ancient Whispers', effect: '+15% herb gathering' },
            { location: 'Crystal Caves', weather: '⚡ Electric Storms', effect: '+20% crystal formation' },
            { location: 'Dragon\'s Peak', weather: '🔥 Volcanic Activity', effect: '+25% rare metals' }
        ];

        embed.addFields({
            name: '🗺️ Regional Forecast',
            value: forecast.map(f => `**${f.location}:** ${f.weather} (${f.effect})`).join('\n'),
            inline: false
        });

        const button1 = new ButtonBuilder()
            .setCustomId('weather_refresh')
            .setLabel('Refresh Weather')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');

        const button2 = new ButtonBuilder()
            .setCustomId('weather_protection')
            .setLabel('Buy Weather Protection')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛡️');

        const button3 = new ButtonBuilder()
            .setCustomId('weather_ritual')
            .setLabel('Perform Weather Ritual')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔮');

        const row = new ActionRowBuilder().addComponents(button1, button2, button3);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};