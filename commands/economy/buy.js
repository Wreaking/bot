
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const shopItems = require('../../utils/shopItems.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase items from the shop')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to purchase')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many items to buy')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const player = await db.getPlayer(interaction.user.id);
            const itemName = interaction.options.getString('item');
            const quantity = interaction.options.getInteger('quantity') || 1;

            if (!itemName) {
                await this.showShopInterface(interaction, player);
                return;
            }

            const item = shopItems.findItem(itemName);
            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`Item "${itemName}" is not available in the shop!`)
                    .addFields([
                        { name: '💡 Tip', value: 'Use `/shop` to see all available items' }
                    ])
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const totalCost = item.price * quantity;
            
            if (player.coins < totalCost) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('💸 Insufficient Funds')
                    .setDescription(`You need **${totalCost.toLocaleString()}** ${config.emojis.coin} coins but only have **${player.coins.toLocaleString()}**!`)
                    .addFields([
                        { name: 'Item', value: item.name, inline: true },
                        { name: 'Price Each', value: `${item.price.toLocaleString()} ${config.emojis.coin}`, inline: true },
                        { name: 'Quantity', value: quantity.toString(), inline: true },
                        { name: 'Total Cost', value: `${totalCost.toLocaleString()} ${config.emojis.coin}`, inline: true },
                        { name: 'Your Balance', value: `${player.coins.toLocaleString()} ${config.emojis.coin}`, inline: true },
                        { name: 'Needed', value: `${(totalCost - player.coins).toLocaleString()} ${config.emojis.coin}`, inline: true }
                    ])
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('work_for_coins')
                            .setLabel('Work for Coins')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💰'),
                        new ButtonBuilder()
                            .setCustomId('view_shop')
                            .setLabel('View Shop')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🛒')
                    );

                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                return;
            }

            // Process purchase
            player.coins -= totalCost;
            
            if (!player.inventory) player.inventory = {};
            player.inventory[item.name] = (player.inventory[item.name] || 0) + quantity;
            
            await db.savePlayer(player);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('✅ Purchase Successful!')
                .setDescription(`You bought **${quantity}x ${item.name}** for **${totalCost.toLocaleString()}** ${config.emojis.coin} coins!`)
                .addFields([
                    { name: 'Item Purchased', value: item.name, inline: true },
                    { name: 'Quantity', value: quantity.toString(), inline: true },
                    { name: 'Total Cost', value: `${totalCost.toLocaleString()} ${config.emojis.coin}`, inline: true },
                    { name: 'Remaining Balance', value: `${player.coins.toLocaleString()} ${config.emojis.coin}`, inline: true },
                    { name: 'Item Description', value: item.description || 'A valuable item', inline: false }
                ])
                .setFooter({ text: `You now own ${player.inventory[item.name]} of this item` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('view_inventory')
                        .setLabel('View Inventory')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎒'),
                    new ButtonBuilder()
                        .setCustomId('buy_more')
                        .setLabel('Buy More')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🛒'),
                    new ButtonBuilder()
                        .setCustomId('equip_item')
                        .setLabel('Equip Item')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚔️')
                );

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Buy command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Purchase Failed')
                .setDescription('An error occurred while processing your purchase.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async showShopInterface(interaction, player) {
        const categories = shopItems.getCategories();
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.shop)
            .setTitle('🛒 Adventure Shop')
            .setDescription('Welcome to the Adventure Shop! Choose a category or browse featured items.')
            .addFields([
                { name: '💰 Your Balance', value: `${player.coins.toLocaleString()} ${config.emojis.coin} coins`, inline: true },
                { name: '🎒 Inventory Space', value: `${Object.keys(player.inventory || {}).length}/100 items`, inline: true },
                { name: '⭐ Shop Features', value: '• Multiple categories\n• Bulk purchases\n• Item previews\n• Price comparisons', inline: false }
            ])
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_category')
            .setPlaceholder('Choose a shop category...')
            .addOptions(
                categories.map(category => ({
                    label: category.name,
                    description: `${category.items.length} items available`,
                    value: `shop_${category.name.toLowerCase()}`,
                    emoji: category.emoji
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(categorySelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_featured')
                    .setLabel('Featured Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('shop_deals')
                    .setLabel('Daily Deals')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💸'),
                new ButtonBuilder()
                    .setCustomId('shop_all')
                    .setLabel('All Items')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📦')
            );

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },

    async handleButtonInteraction(interaction, buttonId) {
        const player = await db.getPlayer(interaction.user.id);

        switch(buttonId) {
            case 'work_for_coins':
                await interaction.reply({
                    content: 'Use `/work` to earn more coins!',
                    ephemeral: true
                });
                break;

            case 'view_shop':
                await this.showShopInterface(interaction, player);
                break;

            case 'view_inventory':
                await interaction.reply({
                    content: 'Use `/inventory` to view your items!',
                    ephemeral: true
                });
                break;

            case 'buy_more':
                await this.showShopInterface(interaction, player);
                break;

            case 'equip_item':
                await interaction.reply({
                    content: 'Use `/equip` to equip your items!',
                    ephemeral: true
                });
                break;

            case 'shop_featured':
            case 'shop_deals':
            case 'shop_all':
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.info)
                    .setTitle('🚧 Feature Coming Soon!')
                    .setDescription(`The ${buttonId.replace('shop_', '')} feature is being developed.`)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
                break;
        }
    },

    async handleSelectMenu(interaction, action) {
        if (action.startsWith('shop_')) {
            const category = action.replace('shop_', '');
            const items = shopItems.getItemsByCategory(category);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.shop)
                .setTitle(`🛒 ${category.charAt(0).toUpperCase() + category.slice(1)} Items`)
                .setDescription(items.slice(0, 10).map(item => 
                    `**${item.name}** - ${item.price.toLocaleString()} ${config.emojis.coin}\n${item.description}`
                ).join('\n\n'))
                .setFooter({ text: `Showing ${Math.min(items.length, 10)} of ${items.length} items` })
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
