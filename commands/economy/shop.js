
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const { db } = require('../../database.js');
const { ItemManager, EquipmentType } = require('../../game/Items.js');

const SHOP_CATEGORIES = {
    weapons: { name: '⚔️ Weapons', emoji: '⚔️' },
    armor: { name: '🛡️ Armor', emoji: '🛡️' },
    accessories: { name: '💍 Accessories', emoji: '💍' },
    tools: { name: '🔧 Tools', emoji: '🔧' },
    consumables: { name: '🧪 Consumables', emoji: '🧪' },
    materials: { name: '🔨 Materials', emoji: '🔨' },
    special: { name: '⭐ Special Items', emoji: '⭐' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Browse and purchase items from the treasure hunter shop!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Browse specific item category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessories', value: 'accessories' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Consumables', value: 'consumables' },
                    { name: '🔨 Materials', value: 'materials' },
                    { name: '⭐ Special Items', value: 'special' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Buy specific item directly')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Number of items to buy')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50)),

    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const itemName = interaction.options?.getString('item');
        const quantity = interaction.options?.getInteger('quantity') || 1;

        if (itemName) {
            await this.handleDirectPurchase(interaction, itemName, quantity);
        } else if (category) {
            await this.showCategory(interaction, category);
        } else {
            await this.showMainShop(interaction);
        }
    },

    async showMainShop(interaction) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        const itemManager = new ItemManager();
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.shop || '#FFD700')
            .setTitle('🏪 Treasure Hunter\'s Emporium')
            .setDescription('**Welcome to the finest shop in the realm!**\n*Browse our extensive collection of weapons, armor, tools, and magical items.*')
            .setThumbnail('https://i.imgur.com/shop-icon.png')
            .addFields([
                {
                    name: '💰 Your Wallet',
                    value: `${userData.coins.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '🏪 Shop Features',
                    value: '• Instant delivery\n• Quality guaranteed\n• Bulk discounts available',
                    inline: true
                },
                {
                    name: '🎯 Daily Specials',
                    value: this.getDailySpecials(),
                    inline: true
                }
            ]);

        // Add category previews
        Object.entries(SHOP_CATEGORIES).forEach(([key, cat]) => {
            const items = itemManager.getItemsByType(key);
            const preview = items.slice(0, 3).map(item => `• ${item.name}`).join('\n');
            
            embed.addFields([{
                name: `${cat.emoji} ${cat.name} (${items.length} items)`,
                value: preview + (items.length > 3 ? `\n*+${items.length - 3} more items*` : ''),
                inline: true
            }]);
        });

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_category_select')
            .setPlaceholder('🛒 Choose a category to browse...')
            .addOptions([
                ...Object.entries(SHOP_CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    description: `Browse ${itemManager.getItemsByType(key).length} items`,
                    value: `shop_${key}`,
                    emoji: cat.emoji
                })),
                {
                    label: 'Featured Items',
                    description: 'Hand-picked premium items',
                    value: 'shop_featured',
                    emoji: '✨'
                },
                {
                    label: 'Sale Items',
                    description: 'Discounted items for limited time',
                    value: 'shop_sale',
                    emoji: '🏷️'
                }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_search')
                    .setLabel('🔍 Search Items')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shop_cart')
                    .setLabel('🛒 View Cart')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_history')
                    .setLabel('📋 Purchase History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_wishlist')
                    .setLabel('❤️ Wishlist')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async showCategory(interaction, category) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        const itemManager = new ItemManager();
        const items = itemManager.getItemsByType(category);
        
        if (items.length === 0) {
            return await interaction.reply({
                content: `❌ No items found in the ${category} category.`,
                ephemeral: true
            });
        }

        const categoryInfo = SHOP_CATEGORIES[category];
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.shop || '#FFD700')
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`)
            .setDescription(`**${items.length} premium items available**`)
            .addFields([
                {
                    name: '💰 Your Budget',
                    value: `${userData.coins.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 Price Range',
                    value: this.getPriceRange(items),
                    inline: true
                },
                {
                    name: '⭐ Quality Range',
                    value: this.getQualityRange(items),
                    inline: true
                }
            ]);

        // Sort items by rarity and price
        const sortedItems = items.sort((a, b) => {
            const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
            return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0) || a.price - b.price;
        });

        // Add items to embed (max 10 per page)
        const itemsToShow = sortedItems.slice(0, 10);
        itemsToShow.forEach(item => {
            const affordable = userData.coins >= item.price;
            const priceDisplay = affordable ? 
                `💰 ${item.price.toLocaleString()} coins` : 
                `💰 ~~${item.price.toLocaleString()}~~ coins ❌`;
            
            const statsDisplay = Object.entries(item.stats)
                .map(([stat, value]) => `${this.getStatIcon(stat)} ${value}`)
                .slice(0, 3)
                .join(' • ');

            embed.addFields([{
                name: `${item.getRarityIcon()} ${item.name}`,
                value: `${item.description}\n${priceDisplay}\n${statsDisplay ? `📊 ${statsDisplay}` : ''}`,
                inline: true
            }]);
        });

        if (sortedItems.length > 10) {
            embed.setFooter({ 
                text: `Showing 10 of ${sortedItems.length} items. Use navigation to see more.` 
            });
        }

        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`shop_buy_select_${category}`)
            .setPlaceholder('💰 Select an item to purchase...')
            .addOptions(itemsToShow.map(item => ({
                label: item.name,
                description: `${item.price.toLocaleString()} coins - ${item.rarity}`,
                value: `buy_${item.id}`,
                emoji: item.getRarityIcon()
            })));

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_main')
                    .setLabel('← Back to Shop')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`shop_sort_${category}`)
                    .setLabel('🔄 Sort Options')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`shop_filter_${category}`)
                    .setLabel('🔍 Filter Items')
                    .setStyle(ButtonStyle.Primary)
            );

        if (sortedItems.length > 10) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_next_${category}_10`)
                    .setLabel('Next Page →')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const components = [
            new ActionRowBuilder().addComponents(itemSelect),
            buttons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async handleDirectPurchase(interaction, itemName, quantity) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0, inventory: { items: [] } };
        const itemManager = new ItemManager();
        
        // Find item by name (fuzzy matching)
        const allItems = itemManager.getAllItems();
        const item = allItems.find(i => 
            i.name.toLowerCase().includes(itemName.toLowerCase()) ||
            i.id === itemName
        );

        if (!item) {
            return await interaction.reply({
                content: `❌ Item "${itemName}" not found in shop. Use \`/shop\` to browse available items.`,
                ephemeral: true
            });
        }

        const totalCost = item.price * quantity;
        
        if (userData.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('💸 Insufficient Funds')
                .setDescription(`You need **${(totalCost - userData.coins).toLocaleString()}** more coins!`)
                .addFields([
                    { name: '💰 Your Balance', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                    { name: '🛒 Total Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                    { name: '💡 Tip', value: 'Try `/daily`, `/work`, or `/hunt` to earn more coins!', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Apply bulk discount
        let discount = 0;
        if (quantity >= 10) discount = 0.1;
        else if (quantity >= 5) discount = 0.05;
        
        const discountedCost = Math.floor(totalCost * (1 - discount));
        const savedAmount = totalCost - discountedCost;

        // Process purchase
        for (let i = 0; i < quantity; i++) {
            userData.inventory.items.push({
                id: item.id,
                obtained: Date.now(),
                source: 'shop'
            });
        }

        userData.coins -= discountedCost;

        await db.updatePlayer(interaction.user.id, {
            coins: userData.coins,
            inventory: userData.inventory
        });

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('🎉 Purchase Successful!')
            .setDescription(`**${quantity}x ${item.name}** added to your inventory!`)
            .addFields([
                { name: '💰 Cost', value: `${discountedCost.toLocaleString()} coins`, inline: true },
                { name: '💰 Remaining', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                { name: '📦 Items Received', value: `${quantity}x ${item.name}`, inline: true }
            ]);

        if (savedAmount > 0) {
            embed.addFields([
                { name: '🎁 Bulk Discount', value: `Saved ${savedAmount.toLocaleString()} coins (${Math.floor(discount * 100)}% off)!`, inline: false }
            ]);
        }

        embed.setFooter({ text: 'Use /inventory to view your items!' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_main')
                    .setLabel('🛒 Continue Shopping')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    // Autocomplete handler
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const itemManager = new ItemManager();
        const allItems = itemManager.getAllItems();

        const filtered = allItems
            .filter(item => item.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(item => ({
                name: `${item.name} (${item.price.toLocaleString()} coins)`,
                value: item.id
            }));

        await interaction.respond(filtered);
    },

    // Button handlers
    buttonHandlers: {
        async main(interaction) {
            await module.exports.showMainShop(interaction);
        },

        async search(interaction) {
            // Implement search functionality
            await interaction.reply({
                content: '🔍 Search functionality coming soon! Use the category dropdowns for now.',
                ephemeral: true
            });
        },

        async cart(interaction) {
            await interaction.reply({
                content: '🛒 Shopping cart feature coming soon! Items are purchased instantly for now.',
                ephemeral: true
            });
        },

        async history(interaction) {
            await interaction.reply({
                content: '📋 Purchase history feature coming soon!',
                ephemeral: true
            });
        },

        async wishlist(interaction) {
            await interaction.reply({
                content: '❤️ Wishlist feature coming soon!',
                ephemeral: true
            });
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        async category_select(interaction) {
            const selectedValue = interaction.values[0];
            const category = selectedValue.replace('shop_', '');
            
            if (category === 'featured' || category === 'sale') {
                await interaction.reply({
                    content: `✨ ${category} section coming soon!`,
                    ephemeral: true
                });
            } else {
                await this.showCategory(interaction, category);
            }
        },

        async buy_select(interaction) {
            const selectedValue = interaction.values[0];
            const itemId = selectedValue.replace('buy_', '');
            
            await this.handleDirectPurchase(interaction, itemId, 1);
        }
    },

    // Helper methods
    getDailySpecials() {
        const specials = [
            '🎯 Treasure Maps -20%',
            '⚔️ Iron Weapons -15%',
            '🧪 Health Potions -25%'
        ];
        return specials.join('\n');
    },

    getPriceRange(items) {
        if (items.length === 0) return 'N/A';
        const prices = items.map(i => i.price).sort((a, b) => a - b);
        return `${prices[0].toLocaleString()} - ${prices[prices.length - 1].toLocaleString()} coins`;
    },

    getQualityRange(items) {
        const rarities = [...new Set(items.map(i => i.rarity))];
        return rarities.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
    },

    getStatIcon(stat) {
        const icons = {
            attack: '⚔️',
            defense: '🛡️',
            health: '❤️',
            speed: '⚡',
            luck: '🍀',
            power: '💪',
            durability: '🔧'
        };
        return icons[stat.toLowerCase()] || '📊';
    }
};
