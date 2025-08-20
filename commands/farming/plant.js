const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plant')
        .setDescription('🌱 Plant seeds and grow crops on your farm'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            inventory: {},
            farm: { plots: 3, planted: {} }
        };

        const seeds = [
            { name: 'Wheat Seeds', cost: 10, time: '2 hours', yield: 'Wheat (x3)', profit: 25 },
            { name: 'Carrot Seeds', cost: 15, time: '3 hours', yield: 'Carrots (x2)', profit: 35 },
            { name: 'Magic Beans', cost: 50, time: '6 hours', yield: 'Magic Fruit (x1)', profit: 100 },
            { name: 'Dragon Fruit Seeds', cost: 100, time: '12 hours', yield: 'Dragon Fruit (x1)', profit: 250 }
        ];

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌱 Mystical Farm')
            .setDescription('**Welcome to your enchanted farmland!**\n\nPlant magical seeds and harvest valuable crops!')
            .addFields(
                { name: '🏡 Farm Plots', value: `${userProfile.farm?.plots || 3} available`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '🌾 Currently Growing', value: `${Object.keys(userProfile.farm?.planted || {}).length} crops`, inline: true }
            );

        seeds.forEach(seed => {
            embed.addFields({
                name: `🌱 ${seed.name}`,
                value: `**Cost:** ${seed.cost} coins\n**Growth Time:** ${seed.time}\n**Yield:** ${seed.yield}\n**Profit:** ${seed.profit} coins`,
                inline: true
            });
        });

        const buttons = seeds.map((seed, index) => 
            new ButtonBuilder()
                .setCustomId(`plant_${index}`)
                .setLabel(`Plant ${seed.name}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🌱')
        );

        const harvestButton = new ButtonBuilder()
            .setCustomId('harvest_crops')
            .setLabel('Harvest Ready Crops')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🌾');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(harvestButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};