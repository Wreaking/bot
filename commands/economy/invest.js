const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invest')
        .setDescription('📈 Invest your coins for long-term treasure hunting profits'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 },
            investments: { portfolio: {}, totalValue: 0 }
        };

        const investmentOptions = [
            {
                name: 'Treasure Bonds',
                return: '5% daily',
                risk: 'Very Low',
                minAmount: 100,
                description: 'Stable government-backed treasure securities',
                emoji: '📜'
            },
            {
                name: 'Mining Stocks',
                return: '12% daily',
                risk: 'Low',
                minAmount: 500,
                description: 'Invest in profitable mining operations',
                emoji: '⛏️'
            },
            {
                name: 'Adventure Fund',
                return: '20% daily',
                risk: 'Medium',
                minAmount: 1000,
                description: 'High-risk expeditions with big rewards',
                emoji: '🗺️'
            },
            {
                name: 'Dragon Futures',
                return: '35% daily',
                risk: 'High',
                minAmount: 2500,
                description: 'Volatile dragon-related investments',
                emoji: '🐉'
            }
        ];

        const totalInvested = userProfile.investments?.totalValue || 0;
        const dailyIncome = Math.floor(totalInvested * 0.08); // Average 8% return

        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('📈 Investment Portfolio')
            .setDescription('**Grow your wealth through smart investments!**\n\nDiversify your treasure hunting income.')
            .addFields(
                { name: '💰 Available Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '📊 Total Invested', value: `${totalInvested} coins`, inline: true },
                { name: '💵 Daily Income', value: `${dailyIncome} coins`, inline: true }
            );

        investmentOptions.forEach(option => {
            const canInvest = (userProfile.inventory?.coins || 0) >= option.minAmount;
            const status = canInvest ? '✅ Available' : `💰 Need ${option.minAmount} coins`;

            embed.addFields({
                name: `${option.emoji} ${option.name}`,
                value: `**Return:** ${option.return}\n**Risk:** ${option.risk}\n**Min Amount:** ${option.minAmount} coins\n**Status:** ${status}`,
                inline: true
            });
        });

        const investButtons = investmentOptions.map((option, index) => 
            new ButtonBuilder()
                .setCustomId(`invest_${index}`)
                .setLabel(`Invest in ${option.name}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(option.emoji)
        );

        const withdrawButton = new ButtonBuilder()
            .setCustomId('invest_withdraw')
            .setLabel('Withdraw Profits')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💸');

        const portfolioButton = new ButtonBuilder()
            .setCustomId('invest_portfolio')
            .setLabel('View Portfolio')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊');

        const row1 = new ActionRowBuilder().addComponents(investButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(investButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(withdrawButton, portfolioButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};