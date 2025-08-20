
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const { db } = require('../../database.js');
const { ItemManager } = require('../../game/Items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 View and manage your treasure inventory!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter items by category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessories', value: 'accessories' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Consumables', value: 'consumables' },
                    { name: '🔨 Materials', value: 'materials' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s inventory (if public)')
                .setRequired(false)),

    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const isOwnInventory = targetUser.id === interaction.user.id;

        try {
            const userData = await db.getPlayer(targetUser.id);
            if (!userData) {
                return await interaction.reply({
                    content: `❌ ${isOwnInventory ? 'You don\'t' : 'This user doesn\'t'} have a treasure hunter profile yet!`,
                    ephemeral: true
                });
            }

            const inventory = userData.inventory || { items: [] };
            const itemManager = new ItemManager();
            
            // Get all items with their details
            const items = inventory.items.map(item => {
                const details = itemManager.getItem(item.id);
                return { ...item, ...details };
            }).filter(item => item.name); // Filter out items that don't exist anymore

            // Filter by category if specified
            const filteredItems = category ? 
                items.filter(item => item.type === category) : 
                items;

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.inventory || '#8B4513')
                .setTitle(`🎒 ${isOwnInventory ? 'Your' : `${targetUser.displayName}'s`} Treasure Inventory`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields([
                    {
                        name: '📊 Inventory Stats',
                        value: `**Total Items:** ${items.length}\n**Unique Items:** ${new Set(items.map(i => i.id)).size}\n**Categories:** ${new Set(items.map(i => i.type)).size}`,
                        inline: true
                    },
                    {
                        name: '💰 Wallet',
                        value: `${userData.coins?.toLocaleString() || 0} coins`,
                        inline: true
                    },
                    {
                        name: '⭐ Total Value',
                        value: `${items.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString()} coins`,
                        inline: true
                    }
                ]);

            if (filteredItems.length === 0) {
                embed.setDescription(category ? 
                    `No items found in the **${category}** category.` : 
                    'This inventory is empty. Start your treasure hunting adventure!'
                );
            } else {
                // Group items by type for better display
                const groupedItems = {};
                filteredItems.forEach(item => {
                    if (!groupedItems[item.type]) groupedItems[item.type] = [];
                    groupedItems[item.type].push(item);
                });

                // Display items by category
                Object.entries(groupedItems).slice(0, 6).forEach(([type, typeItems]) => {
                    const typeIcon = this.getTypeIcon(type);
                    const itemCounts = {};
                    
                    typeItems.forEach(item => {
                        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
                    });

                    const itemList = Object.entries(itemCounts)
                        .slice(0, 5)
                        .map(([name, count]) => `• ${name} ${count > 1 ? `(×${count})` : ''}`)
                        .join('\n');

                    embed.addFields([{
                        name: `${typeIcon} ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeItems.length})`,
                        value: itemList + (Object.keys(itemCounts).length > 5 ? `\n*+${Object.keys(itemCounts).length - 5} more*` : ''),
                        inline: true
                    }]);
                });

                if (Object.keys(groupedItems).length > 6) {
                    embed.setFooter({ text: `Showing 6 of ${Object.keys(groupedItems).length} categories. Use filters to see more.` });
                }
            }

            // Create interactive components
            const components = [];

            if (items.length > 0) {
                // Category filter dropdown
                const categorySelect = new StringSelectMenuBuilder()
                    .setCustomId(`inventory_filter_${targetUser.id}`)
                    .setPlaceholder('🔍 Filter by category...')
                    .addOptions([
                        { label: 'All Items', value: 'all', emoji: '📦' },
                        ...Object.keys(groupedItems || {}).map(type => ({
                            label: `${this.getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                            value: type,
                            description: `View ${type} items`
                        }))
                    ]);

                components.push(new ActionRowBuilder().addComponents(categorySelect));
            }

            // Action buttons
            const buttons = new ActionRowBuilder();
            
            if (isOwnInventory) {
                buttons.addComponents(
                    new ButtonBuilder()
                        .setCustomId('inventory_sort')
                        .setLabel('🔄 Sort Items')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('inventory_equip')
                        .setLabel('⚔️ Quick Equip')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('inventory_sell')
                        .setLabel('💰 Quick Sell')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inventory_stats')
                    .setLabel('📊 Detailed Stats')
                    .setStyle(ButtonStyle.Secondary)
            );

            if (buttons.components.length > 0) {
                components.push(buttons);
            }

            await interaction.reply({
                embeds: [embed],
                components: components.length > 0 ? components : undefined
            });

        } catch (error) {
            console.error('Inventory command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading the inventory. Please try again.',
                ephemeral: true
            });
        }
    },

    // Button handlers
    buttonHandlers: {
        async sort(interaction) {
            await interaction.reply({
                content: '🔄 Sorting options:\n• **By Type** - Group similar items\n• **By Value** - Highest to lowest\n• **By Rarity** - Legendary to common\n• **By Date** - Newest first',
                ephemeral: true
            });
        },

        async equip(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            const itemManager = new ItemManager();
            
            const equipableItems = userData.inventory?.items
                ?.map(item => itemManager.getItem(item.id))
                ?.filter(item => item && (item.type === 'weapons' || item.type === 'armor'))
                ?.slice(0, 10) || [];

            if (equipableItems.length === 0) {
                return await interaction.reply({
                    content: '❌ No equipable items found in your inventory!',
                    ephemeral: true
                });
            }

            const equipSelect = new StringSelectMenuBuilder()
                .setCustomId('inventory_equip_select')
                .setPlaceholder('⚔️ Choose an item to equip...')
                .addOptions(equipableItems.map(item => ({
                    label: item.name,
                    value: item.id,
                    description: `${item.type} - ${item.rarity}`,
                    emoji: item.getRarityIcon()
                })));

            await interaction.reply({
                content: '⚔️ **Quick Equip Menu**\nSelect an item to equip:',
                components: [new ActionRowBuilder().addComponents(equipSelect)],
                ephemeral: true
            });
        },

        async sell(interaction) {
            await interaction.reply({
                content: '💰 **Quick Sell** feature coming soon!\nFor now, use `/shop` to browse and purchase items.',
                ephemeral: true
            });
        },

        async refresh(interaction) {
            await module.exports.execute(interaction);
        },

        async stats(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            const itemManager = new ItemManager();
            
            const items = userData.inventory?.items?.map(item => {
                const details = itemManager.getItem(item.id);
                return { ...item, ...details };
            }).filter(item => item.name) || [];

            const stats = {
                totalValue: items.reduce((sum, item) => sum + (item.price || 0), 0),
                rarity: {},
                types: {},
                equipped: userData.equipment ? Object.keys(userData.equipment).length : 0
            };

            items.forEach(item => {
                stats.rarity[item.rarity] = (stats.rarity[item.rarity] || 0) + 1;
                stats.types[item.type] = (stats.types[item.type] || 0) + 1;
            });

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099FF')
                .setTitle('📊 Detailed Inventory Statistics')
                .addFields([
                    {
                        name: '💰 Value Breakdown',
                        value: `**Total Value:** ${stats.totalValue.toLocaleString()} coins\n**Average Value:** ${Math.floor(stats.totalValue / Math.max(items.length, 1)).toLocaleString()} coins\n**Most Valuable:** ${items.sort((a, b) => (b.price || 0) - (a.price || 0))[0]?.name || 'None'}`,
                        inline: false
                    },
                    {
                        name: '⭐ Rarity Distribution',
                        value: Object.entries(stats.rarity)
                            .map(([rarity, count]) => `**${rarity}:** ${count}`)
                            .join('\n') || 'No items',
                        inline: true
                    },
                    {
                        name: '📦 Type Distribution',
                        value: Object.entries(stats.types)
                            .map(([type, count]) => `**${type}:** ${count}`)
                            .join('\n') || 'No items',
                        inline: true
                    },
                    {
                        name: '⚔️ Equipment Status',
                        value: `**Equipped Items:** ${stats.equipped}\n**Available Slots:** ${5 - stats.equipped}\n**Equipment Bonus:** +${stats.equipped * 10}% efficiency`,
                        inline: true
                    }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        async filter(interaction) {
            const category = interaction.values[0];
            const targetUserId = interaction.customId.split('_')[2];
            
            if (category === 'all') {
                await module.exports.execute(interaction);
            } else {
                const newInteraction = {
                    ...interaction,
                    options: {
                        getString: (name) => name === 'category' ? category : null,
                        getUser: (name) => name === 'user' ? { id: targetUserId } : null
                    }
                };
                await module.exports.execute(newInteraction);
            }
        },

        async equip_select(interaction) {
            const itemId = interaction.values[0];
            const userData = await db.getPlayer(interaction.user.id);
            const itemManager = new ItemManager();
            const item = itemManager.getItem(itemId);

            if (!item) {
                return await interaction.reply({
                    content: '❌ Item not found!',
                    ephemeral: true
                });
            }

            // Equip logic would go here
            await interaction.reply({
                content: `⚔️ Successfully equipped **${item.name}**!\n*Equipment system integration coming soon.*`,
                ephemeral: true
            });
        }
    },

    // Helper methods
    getTypeIcon(type) {
        const icons = {
            weapons: '⚔️',
            armor: '🛡️',
            accessories: '💍',
            tools: '🔧',
            consumables: '🧪',
            materials: '🔨',
            special: '⭐'
        };
        return icons[type] || '📦';
    }
};
