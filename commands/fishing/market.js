const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Market data
const fishMarket = {
    buyers: [
        { name: 'Local Fishmonger', multiplier: 1.0, minRarity: 'common' },
        { name: 'Fancy Restaurant', multiplier: 1.5, minRarity: 'uncommon' },
        { name: 'Royal Court', multiplier: 2.0, minRarity: 'rare' },
        { name: 'Collector', multiplier: 3.0, minRarity: 'legendary' }
    ],
    rarityValues: {
        common: 1,
        uncommon: 2,
        rare: 3,
        legendary: 4
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('🏪 Interact with the fish market')
        .addSubcommand(subcommand =>
            subcommand
                .setName('prices')
                .setDescription('Check current market prices'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell your caught fish'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trends')
                .setDescription('View market trends and best times to sell')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to start fishing first!',
                    ephemeral: true
                });
                return;
            }

            if (subcommand === 'prices') {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏪 Fish Market Prices')
                    .setDescription('Current buying prices from different merchants:');

                fishMarket.buyers.forEach(buyer => {
                    let description = `Base Multiplier: ${buyer.multiplier}x\n`;
                    description += `Minimum Rarity: ${buyer.minRarity}\n`;
                    description += '```\n';
                    description += 'Example prices:\n';
                    // Add some example prices
                    if (buyer.minRarity === 'common') {
                        description += 'Sardine: 3 × 1.0 = 3 coins\n';
                        description += 'Anchovy: 4 × 1.0 = 4 coins\n';
                    } else if (buyer.minRarity === 'uncommon') {
                        description += 'Trout: 12 × 1.5 = 18 coins\n';
                        description += 'Salmon: 15 × 1.5 = 22 coins\n';
                    }
                    description += '```';

                    embed.addFields({
                        name: `${buyer.name}`,
                        value: description,
                        inline: false
                    });
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'sell') {
                if (!player.inventory?.fish || player.inventory.fish.length === 0) {
                    await interaction.editReply({
                        content: '❌ You don\'t have any fish to sell!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('🏪 Sell Your Fish')
                    .setDescription('Choose a buyer for your fish:');

                const buttons = fishMarket.buyers.map(buyer => {
                    return new ButtonBuilder()
                        .setCustomId(`sell_to_${buyer.name.toLowerCase().replace(' ', '_')}`)
                        .setLabel(buyer.name)
                        .setStyle(ButtonStyle.Primary);
                });

                const row = new ActionRowBuilder()
                    .addComponents(buttons);

                // Add inventory preview
                const inventoryField = {
                    name: '🎣 Your Fish',
                    value: Object.entries(player.inventory.fish.reduce((acc, fish) => {
                        acc[fish.name] = (acc[fish.name] || 0) + 1;
                        return acc;
                    }, {})).map(([name, count]) => `${name}: ${count}`).join('\n'),
                    inline: false
                };

                embed.addFields(inventoryField);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'trends') {
                // Calculate market trends based on time
                const hour = new Date().getHours();
                let trend = '';
                let multiplier = 1.0;

                if (hour >= 6 && hour < 10) {
                    trend = '📈 Morning Rush - Prices are high!';
                    multiplier = 1.2;
                } else if (hour >= 16 && hour < 20) {
                    trend = '📈 Evening Peak - Good selling time!';
                    multiplier = 1.15;
                } else if (hour >= 0 && hour < 6) {
                    trend = '📉 Late Night - Prices are low';
                    multiplier = 0.9;
                } else {
                    trend = '➡️ Normal Market Conditions';
                    multiplier = 1.0;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📊 Market Trends')
                    .setDescription('Current market conditions and predictions:')
                    .addFields(
                        { name: 'Current Trend', value: trend, inline: false },
                        { name: 'Price Multiplier', value: `${multiplier}x`, inline: true },
                        { name: 'Best Selling Time', value: 'Morning (6:00 - 10:00)', inline: true },
                        { name: 'Tips', value: '• Rare fish always sell well\n• Save legendary fish for special events\n• Check trends before selling large quantities', inline: false }
                    );

                const refreshButton = new ButtonBuilder()
                    .setCustomId('refresh_trends')
                    .setLabel('Refresh Trends')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder()
                    .addComponents(refreshButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Error in market command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while accessing the fish market.',
                ephemeral: true
            });
        }
    },
};
