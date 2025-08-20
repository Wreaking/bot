const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('merchant')
        .setDescription('🏪 Visit the traveling merchant for rare goods'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            inventory: {}
        };

        const rareItems = [
            { name: 'Ancient Map', cost: 500, rarity: 'Legendary', effect: 'Reveals hidden treasure locations' },
            { name: 'Phoenix Feather', cost: 300, rarity: 'Epic', effect: 'Grants resurrection ability' },
            { name: 'Time Crystal', cost: 250, rarity: 'Rare', effect: 'Speeds up all activities' },
            { name: 'Luck Charm', cost: 150, rarity: 'Uncommon', effect: 'Increases treasure find rate' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Wandering Merchant')
            .setDescription('**"Welcome, traveler! I have rare treasures from distant lands!"**\n\nSpecial items available for a limited time!')
            .addFields(
                { name: '💰 Your Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '🎒 Inventory Space', value: `${Object.keys(userProfile.inventory || {}).length}/20`, inline: true },
                { name: '⏰ Stock Refreshes', value: 'Every 6 hours', inline: true }
            );

        rareItems.forEach(item => {
            const rarityEmoji = {
                'Legendary': '🌟',
                'Epic': '💜',
                'Rare': '💙',
                'Uncommon': '💚'
            };

            embed.addFields({
                name: `${rarityEmoji[item.rarity]} ${item.name}`,
                value: `**Cost:** ${item.cost} coins\n**Rarity:** ${item.rarity}\n**Effect:** ${item.effect}`,
                inline: true
            });
        });

        const buttons = rareItems.map((item, index) => 
            new ButtonBuilder()
                .setCustomId(`merchant_buy_${index}`)
                .setLabel(`Buy ${item.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💰')
        );

        const sellButton = new ButtonBuilder()
            .setCustomId('merchant_sell')
            .setLabel('Sell Items')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(sellButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};