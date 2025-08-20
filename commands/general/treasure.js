const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('treasure')
        .setDescription('💎 View your collected treasures and rare finds'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            inventory: { coins: 100 },
            treasures: {
                common: {},
                rare: {},
                epic: {},
                legendary: {}
            },
            stats: { totalTreasures: 0, rarest: 'None' }
        };

        const treasureCategories = [
            { name: 'Common Treasures', emoji: '🪙', items: userProfile.treasures?.common || {} },
            { name: 'Rare Artifacts', emoji: '💎', items: userProfile.treasures?.rare || {} },
            { name: 'Epic Relics', emoji: '👑', items: userProfile.treasures?.epic || {} },
            { name: 'Legendary Items', emoji: '⭐', items: userProfile.treasures?.legendary || {} }
        ];

        const totalTreasures = treasureCategories.reduce((sum, cat) => sum + Object.keys(cat.items).length, 0);
        const totalValue = Object.values(userProfile.treasures?.common || {}).reduce((sum, val) => sum + val, 0) * 10 +
                          Object.values(userProfile.treasures?.rare || {}).reduce((sum, val) => sum + val, 0) * 50 +
                          Object.values(userProfile.treasures?.epic || {}).reduce((sum, val) => sum + val, 0) * 200 +
                          Object.values(userProfile.treasures?.legendary || {}).reduce((sum, val) => sum + val, 0) * 1000;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Your Treasure Collection')
            .setDescription('**Behold your magnificent hoard!**\n\nA testament to your treasure hunting prowess.')
            .addFields(
                { name: '📦 Total Treasures', value: `${totalTreasures} items`, inline: true },
                { name: '💰 Collection Value', value: `${totalValue} coins`, inline: true },
                { name: '🏆 Rarest Find', value: userProfile.stats?.rarest || 'None yet', inline: true }
            );

        treasureCategories.forEach(category => {
            const itemCount = Object.keys(category.items).length;
            const topItems = Object.entries(category.items)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([name, count]) => `${name} (x${count})`)
                .join('\n') || 'None collected';

            embed.addFields({
                name: `${category.emoji} ${category.name} (${itemCount})`,
                value: topItems,
                inline: true
            });
        });

        // Show recent discoveries
        const recentFinds = [
            'Ancient Coin (2 hours ago)',
            'Crystal Shard (5 hours ago)',
            'Magic Ring (1 day ago)'
        ];

        embed.addFields({
            name: '🕐 Recent Discoveries',
            value: recentFinds.join('\n') || 'No recent finds',
            inline: false
        });

        const sortButton = new ButtonBuilder()
            .setCustomId('treasure_sort')
            .setLabel('Sort Collection')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊');

        const sellButton = new ButtonBuilder()
            .setCustomId('treasure_sell')
            .setLabel('Sell Treasures')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸');

        const displayButton = new ButtonBuilder()
            .setCustomId('treasure_display')
            .setLabel('Display Case')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🏛️');

        const appraiseButton = new ButtonBuilder()
            .setCustomId('treasure_appraise')
            .setLabel('Appraise Items')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔍');

        const row1 = new ActionRowBuilder().addComponents(sortButton, sellButton);
        const row2 = new ActionRowBuilder().addComponents(displayButton, appraiseButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};