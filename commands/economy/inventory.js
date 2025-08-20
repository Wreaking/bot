const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 View and manage your adventure inventory')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter by item category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Potions', value: 'potions' },
                    { name: '🐾 Pets', value: 'pets' },
                    { name: '💎 Valuables', value: 'valuables' }
                )),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const userId = interaction.user.id;
        
        // Get user data
        const userData = await db.getPlayer(userId) || {
            inventory: { coins: 0, items: [] },
            equipment: {},
            pets: []
        };
        
        const items = userData.inventory.items || [];
        const coins = userData.inventory.coins || 0;
        const equipped = userData.equipment || {};
        const pets = userData.pets || [];
        
        // Filter items by category if specified
        let filteredItems = items;
        if (category) {
            filteredItems = items.filter(item => item.category === category);
        }
        
        // Group items by category
        const categorizedItems = {
            weapons: filteredItems.filter(item => item.category === 'weapons'),
            armor: filteredItems.filter(item => item.category === 'armor'),
            tools: filteredItems.filter(item => item.category === 'tools'),
            potions: filteredItems.filter(item => item.category === 'potions'),
            pets: pets,
            valuables: filteredItems.filter(item => item.category === 'valuables')
        };
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.inventory)
            .setTitle(`🎒 ${interaction.user.displayName}'s Inventory`)
            .setDescription(`**Total Items:** ${items.length} • **Wallet:** ${coins} coins`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '💰 Wallet & Currency',
                    value: `${config.emojis.coin} **${coins}** coins\n💎 **${categorizedItems.valuables.length}** valuable items\n🎁 **${items.filter(i => i.rarity === 'legendary').length}** legendary items`,
                    inline: true
                },
                {
                    name: '⚔️ Combat Equipment',
                    value: `🗡️ **${categorizedItems.weapons.length}** weapons\n🛡️ **${categorizedItems.armor.length}** armor pieces\n⚡ **${Object.keys(equipped).length}** equipped`,
                    inline: true
                },
                {
                    name: '🎒 Utilities & Items',
                    value: `🔧 **${categorizedItems.tools.length}** tools\n🧪 **${categorizedItems.potions.length}** potions\n🐾 **${pets.length}** companions`,
                    inline: true
                }
            ]);
            
        // Add equipped items section
        if (Object.keys(equipped).length > 0) {
            const equippedText = [
                equipped.weapon ? `⚔️ ${equipped.weapon}` : '',
                equipped.armor ? `🛡️ ${equipped.armor}` : '',
                equipped.accessory ? `💍 ${equipped.accessory}` : '',
                equipped.tool ? `🔧 ${equipped.tool}` : ''
            ].filter(Boolean).join('\n') || 'No items equipped';
            
            embed.addFields([
                { name: '⚡ Currently Equipped', value: equippedText, inline: false }
            ]);
        }
        
        // Add category details if filtering
        if (category && filteredItems.length > 0) {
            const itemList = filteredItems.slice(0, 10).map((item, index) => {
                const equipped = Object.values(userData.equipment || {}).includes(item.name) ? ' ⚡' : '';
                const rarity = item.rarity ? ` (${item.rarity})` : '';
                return `${index + 1}. ${item.emoji || '📦'} ${item.name}${rarity}${equipped}`;
            }).join('\n');
            
            if (filteredItems.length > 10) {
                itemList += `\n*... and ${filteredItems.length - 10} more items*`;
            }
            
            embed.addFields([
                { 
                    name: `${this.getCategoryEmoji(category)} ${this.getCategoryName(category)} (${filteredItems.length})`, 
                    value: itemList || 'No items in this category',
                    inline: false 
                }
            ]);
        }
        
        // Create action components
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('inventory_category_select')
            .setPlaceholder('📂 Filter by category...')
            .addOptions([
                {
                    label: 'All Items',
                    description: 'Show all inventory items',
                    value: 'inventory_all',
                    emoji: '📦'
                },
                {
                    label: 'Weapons',
                    description: `${categorizedItems.weapons.length} weapons`,
                    value: 'inventory_weapons',
                    emoji: '⚔️'
                },
                {
                    label: 'Armor & Defense',
                    description: `${categorizedItems.armor.length} armor pieces`,
                    value: 'inventory_armor',
                    emoji: '🛡️'
                },
                {
                    label: 'Tools & Utilities',
                    description: `${categorizedItems.tools.length} tools`,
                    value: 'inventory_tools',
                    emoji: '🔧'
                },
                {
                    label: 'Potions & Consumables',
                    description: `${categorizedItems.potions.length} potions`,
                    value: 'inventory_potions',
                    emoji: '🧪'
                },
                {
                    label: 'Pets & Companions',
                    description: `${pets.length} companions`,
                    value: 'inventory_pets',
                    emoji: '🐾'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_organize')
                    .setLabel('📋 Organize')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inventory_use')
                    .setLabel('🧪 Use Item')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inventory_equip')
                    .setLabel('⚡ Manage Equipment')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_visit')
                    .setLabel('🛒 Visit Shop')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];
        
        // Add specific item actions if viewing a category
        if (category && filteredItems.length > 0) {
            const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('inventory_item_select')
                .setPlaceholder('🎯 Select an item to manage...')
                .addOptions(
                    filteredItems.slice(0, 25).map((item, index) => ({
                        label: item.name,
                        description: item.description || 'No description available',
                        value: `item_${item.id || index}`,
                        emoji: item.emoji || '📦'
                    }))
                );
                
            components.unshift(new ActionRowBuilder().addComponents(itemSelect));
        }
        
        embed.setFooter({ 
            text: `💡 Use category filter or select items to manage them • ${items.length} total items` 
        });
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    getCategoryName(category) {
        const names = {
            weapons: 'Weapons',
            armor: 'Armor & Defense',
            tools: 'Tools & Utilities',
            potions: 'Potions & Consumables',
            pets: 'Pets & Companions',
            valuables: 'Valuable Items'
        };
        return names[category] || 'Unknown Category';
    },
    
    getCategoryEmoji(category) {
        const emojis = {
            weapons: '⚔️',
            armor: '🛡️',
            tools: '🔧',
            potions: '🧪',
            pets: '🐾',
            valuables: '💎'
        };
        return emojis[category] || '📦';
    }
};