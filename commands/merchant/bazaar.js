const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bazaar')
        .setDescription('🏪 Trade and barter at the merchant bazaar')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse merchant offerings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell your items to merchants')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to sell')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('haggle')
                .setDescription('Attempt to negotiate better prices')
                .addStringOption(option =>
                    option.setName('merchant')
                        .setDescription('Which merchant to haggle with')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reputation')
                .setDescription('Check your standing with different merchants')),

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
                    reputation: {
                        general: 0,
                        blacksmith: 0,
                        alchemist: 0,
                        jeweler: 0
                    },
                    lastHaggle: 0,
                    transactions: 0
                };
            }

            const merchants = {
                blacksmith: {
                    name: '⚒️ Master Smith',
                    specialty: 'weapons and armor',
                    items: [
                        { name: 'Iron Sword', cost: 100, type: 'weapon' },
                        { name: 'Steel Armor', cost: 250, type: 'armor' },
                        { name: 'Quality Shield', cost: 150, type: 'armor' }
                    ]
                },
                alchemist: {
                    name: '🧪 Mystic Brewer',
                    specialty: 'potions and reagents',
                    items: [
                        { name: 'Health Potion', cost: 50, type: 'consumable' },
                        { name: 'Mana Crystal', cost: 75, type: 'material' },
                        { name: 'Speed Elixir', cost: 100, type: 'consumable' }
                    ]
                },
                jeweler: {
                    name: '💎 Gem Master',
                    specialty: 'gems and jewelry',
                    items: [
                        { name: 'Ruby Ring', cost: 300, type: 'accessory' },
                        { name: 'Sapphire Amulet', cost: 400, type: 'accessory' },
                        { name: 'Diamond', cost: 500, type: 'material' }
                    ]
                }
            };

            if (subcommand === 'browse') {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏪 Merchant Bazaar')
                    .setDescription('Welcome to the bazaar! Here are today\'s offerings:');

                Object.entries(merchants).forEach(([type, merchant]) => {
                    let itemList = '';
                    merchant.items.forEach(item => {
                        const discount = Math.floor(player.merchant.reputation[type] / 10) * 5;
                        const finalCost = Math.max(1, Math.floor(item.cost * (1 - discount / 100)));
                        itemList += `${item.name}: ${finalCost} gold ${discount > 0 ? `(-${discount}%)` : ''}\n`;
                    });

                    embed.addFields({
                        name: merchant.name,
                        value: `Specialty: ${merchant.specialty}\n\nItems:\n${itemList}`,
                        inline: false
                    });
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'sell') {
                const itemName = interaction.options.getString('item');
                const quantity = interaction.options.getInteger('quantity');

                if (!player.inventory?.items) {
                    await interaction.editReply({
                        content: '❌ You don\'t have any items to sell!',
                        ephemeral: true
                    });
                    return;
                }

                const itemCount = player.inventory.items.filter(i => i === itemName).length;
                if (itemCount < quantity) {
                    await interaction.editReply({
                        content: `❌ You only have ${itemCount} ${itemName}(s)!`,
                        ephemeral: true
                    });
                    return;
                }

                let baseValue = 0;
                let merchant = '';

                // Determine item value and appropriate merchant
                Object.entries(merchants).forEach(([type, m]) => {
                    m.items.forEach(item => {
                        if (item.name.toLowerCase() === itemName.toLowerCase()) {
                            baseValue = Math.floor(item.cost * 0.6); // Base sell value is 60% of buy price
                            merchant = type;
                        }
                    });
                });

                if (baseValue === 0) {
                    await interaction.editReply({
                        content: '❌ This item cannot be sold here!',
                        ephemeral: true
                    });
                    return;
                }

                // Apply reputation bonus
                const bonus = Math.floor(player.merchant.reputation[merchant] / 10) * 2;
                const finalValue = Math.floor(baseValue * (1 + bonus / 100)) * quantity;

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏪 Sell Items')
                    .setDescription(`Sell ${quantity} ${itemName}(s)?`)
                    .addFields(
                        { name: 'Base Value', value: `${baseValue * quantity} gold`, inline: true },
                        { name: 'Reputation Bonus', value: `+${bonus}%`, inline: true },
                        { name: 'Final Offer', value: `${finalValue} gold`, inline: true }
                    );

                const sell = new ButtonBuilder()
                    .setCustomId('sell_confirm')
                    .setLabel('Accept Offer')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰');

                const cancel = new ButtonBuilder()
                    .setCustomId('sell_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(sell, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'sell_confirm') {
                        // Remove items from inventory
                        for (let i = 0; i < quantity; i++) {
                            const index = player.inventory.items.findIndex(item => item === itemName);
                            player.inventory.items.splice(index, 1);
                        }

                        player.gold += finalValue;
                        player.merchant.reputation[merchant] += 1;
                        player.merchant.transactions += 1;

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('💰 Sale Complete')
                            .setDescription(`You sold ${quantity} ${itemName}(s) for ${finalValue} gold!`)
                            .addFields(
                                { name: 'New Balance', value: player.gold.toString(), inline: true },
                                { name: `${merchants[merchant].name} Reputation`, value: player.merchant.reputation[merchant].toString(), inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Sale cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Sale offer expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'haggle') {
                const merchantType = interaction.options.getString('merchant');
                const currentTime = Date.now();
                const haggleCooldown = 3600000; // 1 hour

                if (currentTime - player.merchant.lastHaggle < haggleCooldown) {
                    const remainingTime = Math.ceil((haggleCooldown - (currentTime - player.merchant.lastHaggle)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You must wait ${remainingTime} more minutes before haggling again.`,
                        ephemeral: true
                    });
                    return;
                }

                if (!merchants[merchantType]) {
                    await interaction.editReply({
                        content: '❌ Invalid merchant type!',
                        ephemeral: true
                    });
                    return;
                }

                const merchant = merchants[merchantType];
                const reputation = player.merchant.reputation[merchantType];
                const baseChance = 0.3 + (reputation * 0.02); // 30% base + 2% per reputation level

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🤝 Haggle')
                    .setDescription(`Attempt to haggle with ${merchant.name}?`)
                    .addFields(
                        { name: 'Current Reputation', value: reputation.toString(), inline: true },
                        { name: 'Success Chance', value: `${Math.floor(baseChance * 100)}%`, inline: true }
                    );

                const haggle = new ButtonBuilder()
                    .setCustomId('haggle_confirm')
                    .setLabel('Try Haggling')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🤝');

                const cancel = new ButtonBuilder()
                    .setCustomId('haggle_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(haggle, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'haggle_confirm') {
                        player.merchant.lastHaggle = currentTime;

                        const success = Math.random() < baseChance;
                        if (success) {
                            player.merchant.reputation[merchantType] += 1;
                            await db.updatePlayer(userId, player);

                            const successEmbed = new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('🤝 Haggling Success!')
                                .setDescription(`${merchant.name} respects your bargaining skills!`)
                                .addFields(
                                    { name: 'New Reputation', value: player.merchant.reputation[merchantType].toString(), inline: true },
                                    { name: 'Discount', value: `${Math.floor(player.merchant.reputation[merchantType] / 10) * 5}%`, inline: true }
                                );

                            await confirmation.update({
                                embeds: [successEmbed],
                                components: []
                            });
                        } else {
                            const failEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🤝 Haggling Failed')
                                .setDescription(`${merchant.name} refuses to budge on their prices.`)
                                .addFields({
                                    name: 'Try Again In',
                                    value: '1 hour',
                                    inline: true
                                });

                            await confirmation.update({
                                embeds: [failEmbed],
                                components: []
                            });
                        }
                    } else {
                        await confirmation.update({
                            content: '❌ Haggling cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Haggling attempt expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'reputation') {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('📊 Merchant Relations')
                    .setDescription('Your standing with the merchants:')
                    .addFields(
                        { name: '⚒️ Blacksmith', value: `Reputation: ${player.merchant.reputation.blacksmith}\nDiscount: ${Math.floor(player.merchant.reputation.blacksmith / 10) * 5}%`, inline: true },
                        { name: '🧪 Alchemist', value: `Reputation: ${player.merchant.reputation.alchemist}\nDiscount: ${Math.floor(player.merchant.reputation.alchemist / 10) * 5}%`, inline: true },
                        { name: '💎 Jeweler', value: `Reputation: ${player.merchant.reputation.jeweler}\nDiscount: ${Math.floor(player.merchant.reputation.jeweler / 10) * 5}%`, inline: true },
                        { name: '📈 Statistics', value: `Total Transactions: ${player.merchant.transactions}`, inline: false }
                    );

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in bazaar command:', error);
            await interaction.editReply({
                content: '❌ An error occurred at the bazaar.',
                ephemeral: true
            });
        }
    },
};
