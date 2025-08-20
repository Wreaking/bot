const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('🔄 Convert materials and currencies in your inventory'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 },
            items: {}
        };

        const conversions = [
            { from: 'Iron Ore (x10)', to: 'Iron Ingot (x1)', rate: '10:1', emoji: '⚙️' },
            { from: 'Gems (x5)', to: 'Rare Crystal (x1)', rate: '5:1', emoji: '💎' },
            { from: 'Wood (x20)', to: 'Enchanted Plank (x1)', rate: '20:1', emoji: '🌳' },
            { from: 'Coins (x100)', to: 'Gold Bar (x1)', rate: '100:1', emoji: '💰' },
            { from: 'Herbs (x15)', to: 'Magic Essence (x1)', rate: '15:1', emoji: '🌿' },
            { from: 'Fish (x8)', to: 'Premium Bait (x1)', rate: '8:1', emoji: '🐟' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔄 Material Converter')
            .setDescription('**Transform common materials into rare resources!**\n\nUpgrade your inventory with better items.')
            .addFields(
                { name: '💰 Current Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '📦 Inventory Items', value: `${Object.keys(userProfile.items || {}).length}`, inline: true },
                { name: '🔄 Conversion Fee', value: '5% per transaction', inline: true }
            );

        conversions.forEach((conversion, index) => {
            embed.addFields({
                name: `${conversion.emoji} Conversion ${index + 1}`,
                value: `**From:** ${conversion.from}\n**To:** ${conversion.to}\n**Rate:** ${conversion.rate}`,
                inline: true
            });
        });

        const conversionButtons = conversions.map((conversion, index) => 
            new ButtonBuilder()
                .setCustomId(`convert_${index}`)
                .setLabel(`Convert ${conversion.from.split(' ')[0]}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(conversion.emoji)
        );

        const bulkButton = new ButtonBuilder()
            .setCustomId('convert_bulk')
            .setLabel('Bulk Convert')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📦');

        const ratesButton = new ButtonBuilder()
            .setCustomId('convert_rates')
            .setLabel('Exchange Rates')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊');

        const row1 = new ActionRowBuilder().addComponents(conversionButtons.slice(0, 3));
        const row2 = new ActionRowBuilder().addComponents(conversionButtons.slice(3, 6));
        const row3 = new ActionRowBuilder().addComponents(bulkButton, ratesButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};