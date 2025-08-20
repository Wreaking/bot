const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('caravan')
        .setDescription('🐪 Join a merchant caravan for trading')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an outgoing caravan')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Trading destination')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Desert Bazaar', value: 'desert' },
                            { name: 'Mountain Market', value: 'mountain' },
                            { name: 'Coastal Port', value: 'coast' },
                            { name: 'Forest Trading Post', value: 'forest' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invest')
                .setDescription('Invest in caravan goods')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to invest')
                        .setRequired(true)
                        .setMinValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check caravan status')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize merchant data if it doesn't exist
            if (!player.merchant) {
                player.merchant = {
                    activeCaravan: null,
                    investments: {},
                    reputation: 0,
                    completedRoutes: {}
                };
            }

            const caravanData = {
                desert: {
                    duration: 4 * 60 * 60 * 1000, // 4 hours
                    risk: 'high',
                    profit: { min: 1.5, max: 3.0 },
                    goods: ['spices', 'silk', 'gems']
                },
                mountain: {
                    duration: 3 * 60 * 60 * 1000, // 3 hours
                    risk: 'medium',
                    profit: { min: 1.3, max: 2.0 },
                    goods: ['ore', 'furs', 'herbs']
                },
                coast: {
                    duration: 2 * 60 * 60 * 1000, // 2 hours
                    risk: 'low',
                    profit: { min: 1.1, max: 1.5 },
                    goods: ['fish', 'salt', 'pearls']
                },
                forest: {
                    duration: 1 * 60 * 60 * 1000, // 1 hour
                    risk: 'low',
                    profit: { min: 1.1, max: 1.3 },
                    goods: ['wood', 'honey', 'mushrooms']
                }
            };

            if (subcommand === 'join') {
                if (player.merchant.activeCaravan) {
                    await interaction.editReply({
                        content: '❌ You\'re already part of a caravan!',
                        ephemeral: true
                    });
                    return;
                }

                const destination = interaction.options.getString('destination');
                const route = caravanData[destination];

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🐪 Caravan Journey')
                    .setDescription(`Join a caravan to ${destination}?`)
                    .addFields(
                        { name: 'Duration', value: `${route.duration / (60 * 60 * 1000)} hours`, inline: true },
                        { name: 'Risk Level', value: route.risk, inline: true },
                        { name: 'Potential Profit', value: `${route.profit.min}x - ${route.profit.max}x`, inline: true },
                        { name: 'Trading Goods', value: route.goods.join(', '), inline: false }
                    );

                const join = new ButtonBuilder()
                    .setCustomId('caravan_join')
                    .setLabel('Join Caravan')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🐪');

                const cancel = new ButtonBuilder()
                    .setCustomId('caravan_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(join, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'caravan_join') {
                        player.merchant.activeCaravan = {
                            destination: destination,
                            startTime: Date.now(),
                            endTime: Date.now() + route.duration,
                            invested: 0
                        };

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🐪 Caravan Joined!')
                            .setDescription(`You've joined a caravan to ${destination}!`)
                            .addFields(
                                { name: 'Returns', value: `<t:${Math.floor(player.merchant.activeCaravan.endTime / 1000)}:R>`, inline: true },
                                { name: 'Next Step', value: 'Use `/caravan invest` to invest in trading goods!', inline: false }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Caravan journey cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Caravan offer expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'invest') {
                if (!player.merchant.activeCaravan) {
                    await interaction.editReply({
                        content: '❌ You need to join a caravan first!',
                        ephemeral: true
                    });
                    return;
                }

                const amount = interaction.options.getInteger('amount');
                if (player.coins < amount) {
                    await interaction.editReply({
                        content: `❌ You need ${amount} coins to invest!`,
                        ephemeral: true
                    });
                    return;
                }

                const route = caravanData[player.merchant.activeCaravan.destination];
                player.coins -= amount;
                player.merchant.activeCaravan.invested += amount;

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💰 Investment Made!')
                    .setDescription(`You've invested ${amount} coins in the caravan!`)
                    .addFields(
                        { name: 'Total Investment', value: player.merchant.activeCaravan.invested.toString(), inline: true },
                        { name: 'Potential Return', value: `${Math.floor(player.merchant.activeCaravan.invested * route.profit.min)} - ${Math.floor(player.merchant.activeCaravan.invested * route.profit.max)} coins`, inline: true },
                        { name: 'Returns', value: `<t:${Math.floor(player.merchant.activeCaravan.endTime / 1000)}:R>`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'status') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🐪 Caravan Status');

                if (player.merchant.activeCaravan) {
                    const route = caravanData[player.merchant.activeCaravan.destination];
                    const timeLeft = player.merchant.activeCaravan.endTime - Date.now();

                    if (timeLeft <= 0) {
                        // Caravan has returned - calculate profits
                        const riskFactor = Math.random();
                        let profitMultiplier;
                        let event = '';

                        if (route.risk === 'high') {
                            if (riskFactor < 0.1) {
                                profitMultiplier = 0.5; // Disaster
                                event = '🔥 Your caravan was ambushed! Some goods were lost.';
                            } else if (riskFactor < 0.3) {
                                profitMultiplier = route.profit.min;
                                event = '⚠️ The journey was treacherous, but you made it.';
                            } else {
                                profitMultiplier = route.profit.max;
                                event = '✨ Despite the risks, the journey was very profitable!';
                            }
                        } else {
                            profitMultiplier = route.profit.min + (Math.random() * (route.profit.max - route.profit.min));
                            event = '✅ The caravan returned safely.';
                        }

                        const earnings = Math.floor(player.merchant.activeCaravan.invested * profitMultiplier);
                        player.coins += earnings;
                        player.merchant.reputation += Math.floor(earnings / 100);
                        
                        if (!player.merchant.completedRoutes[player.merchant.activeCaravan.destination]) {
                            player.merchant.completedRoutes[player.merchant.activeCaravan.destination] = 0;
                        }
                        player.merchant.completedRoutes[player.merchant.activeCaravan.destination]++;

                        player.merchant.activeCaravan = null;
                        await db.updatePlayer(userId, player);

                        embed.setDescription(event)
                            .addFields(
                                { name: 'Earnings', value: `${earnings} coins`, inline: true },
                                { name: 'Profit', value: `${Math.floor((profitMultiplier - 1) * 100)}%`, inline: true },
                                { name: 'Merchant Reputation', value: player.merchant.reputation.toString(), inline: true }
                            );
                    } else {
                        embed.setDescription(`Your caravan is en route to ${player.merchant.activeCaravan.destination}!`)
                            .addFields(
                                { name: 'Investment', value: player.merchant.activeCaravan.invested.toString(), inline: true },
                                { name: 'Returns', value: `<t:${Math.floor(player.merchant.activeCaravan.endTime / 1000)}:R>`, inline: true },
                                { name: 'Potential Profit', value: `${route.profit.min}x - ${route.profit.max}x`, inline: true }
                            );
                    }
                } else {
                    embed.setDescription('You\'re not part of any caravan.')
                        .addFields(
                            { name: 'Merchant Level', value: player.merchant.reputation.toString(), inline: true },
                            { name: 'Completed Routes', value: Object.entries(player.merchant.completedRoutes || {})
                                .map(([route, count]) => `${route}: ${count}`).join('\n') || 'None', inline: false }
                        );
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in caravan command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing the caravan.',
                ephemeral: true
            });
        }
    },
};
