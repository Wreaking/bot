const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Quality levels and their bonuses
const qualityLevels = {
    poor: { multiplier: 0.8, chance: 0.15, color: '#8B8B8B', emoji: '💔' },
    common: { multiplier: 1.0, chance: 0.40, color: '#FFFFFF', emoji: '⚪' },
    uncommon: { multiplier: 1.2, chance: 0.25, color: '#32CD32', emoji: '🟢' },
    rare: { multiplier: 1.5, chance: 0.12, color: '#4169E1', emoji: '🔷' },
    epic: { multiplier: 2.0, chance: 0.06, color: '#9932CC', emoji: '🟣' },
    legendary: { multiplier: 3.0, chance: 0.02, color: '#FFD700', emoji: '⭐' }
};

const recipes = {
    weapons: [
        { id: 'iron_sword', name: 'Iron Sword', materials: { iron: 5, wood: 2 }, level: 1, stats: { attack: 15 }, emoji: '⚔️' },
        { id: 'steel_axe', name: 'Steel Battle Axe', materials: { steel: 3, wood: 3 }, level: 5, stats: { attack: 25 }, emoji: '🪓' },
        { id: 'magic_staff', name: 'Enchanted Staff', materials: { crystal: 2, wood: 4, gem: 1 }, level: 8, stats: { magic: 30 }, emoji: '🔮' },
        { id: 'dragon_blade', name: 'Dragon Slayer Blade', materials: { dragon_scale: 1, mythril: 5, gem: 3 }, level: 15, stats: { attack: 50 }, emoji: '🗡️' }
    ],
    armor: [
        { id: 'leather_armor', name: 'Leather Armor', materials: { leather: 6, thread: 4 }, level: 1, stats: { defense: 10 }, emoji: '🥼' },
        { id: 'chain_mail', name: 'Chain Mail', materials: { iron: 8, leather: 2 }, level: 4, stats: { defense: 20 }, emoji: '🛡️' },
        { id: 'plate_armor', name: 'Steel Plate Armor', materials: { steel: 10, leather: 4 }, level: 10, stats: { defense: 35 }, emoji: '🛡️' },
        { id: 'dragon_armor', name: 'Dragon Scale Armor', materials: { dragon_scale: 3, mythril: 2 }, level: 18, stats: { defense: 60 }, emoji: '🛡️' }
    ],
    tools: [
        { id: 'pickaxe', name: 'Iron Pickaxe', materials: { iron: 3, wood: 2 }, level: 1, stats: { mining: 15 }, emoji: '⛏️' },
        { id: 'fishing_rod', name: 'Master Fishing Rod', materials: { wood: 4, thread: 6, hook: 1 }, level: 3, stats: { fishing: 20 }, emoji: '🎣' },
        { id: 'compass', name: 'Magic Compass', materials: { crystal: 1, iron: 2, gem: 1 }, level: 6, stats: { exploration: 25 }, emoji: '🧭' },
        { id: 'telescope', name: 'Star Telescope', materials: { glass: 3, crystal: 2, mythril: 1 }, level: 12, stats: { discovery: 40 }, emoji: '🔭' }
    ],
    potions: [
        { id: 'health_potion', name: 'Health Potion', materials: { herb: 3, water: 1 }, level: 1, stats: { healing: 50 }, emoji: '🧪' },
        { id: 'mana_potion', name: 'Mana Restoration', materials: { crystal: 1, herb: 2, water: 1 }, level: 3, stats: { mana: 40 }, emoji: '💙' },
        { id: 'strength_elixir', name: 'Strength Elixir', materials: { dragon_blood: 1, herb: 4, gem: 1 }, level: 8, stats: { strength: 30 }, emoji: '💪' },
        { id: 'invisibility', name: 'Invisibility Potion', materials: { shadow_essence: 1, herb: 5, crystal: 2 }, level: 12, stats: { stealth: 60 }, emoji: '👻' }
    ],
    accessories: [
        { id: 'power_ring', name: 'Ring of Power', materials: { gold: 3, gem: 2 }, level: 5, stats: { all: 5 }, emoji: '💍' },
        { id: 'speed_boots', name: 'Boots of Speed', materials: { leather: 4, feather: 6, gem: 1 }, level: 7, stats: { speed: 25 }, emoji: '👢' },
        { id: 'wisdom_amulet', name: 'Amulet of Wisdom', materials: { crystal: 3, gold: 2, ancient_rune: 1 }, level: 10, stats: { wisdom: 30 }, emoji: '🔮' },
        { id: 'dragon_pendant', name: 'Dragon Heart Pendant', materials: { dragon_heart: 1, mythril: 3, gem: 5 }, level: 20, stats: { all: 15 }, emoji: '💎' }
    ]
};

const materials = {
    wood: { name: 'Wood', emoji: '🪵', rarity: 'common', sources: ['forage', 'explore'] },
    iron: { name: 'Iron Ore', emoji: '⚫', rarity: 'common', sources: ['mine'] },
    leather: { name: 'Leather', emoji: '🟤', rarity: 'common', sources: ['hunt', 'shop'] },
    thread: { name: 'Thread', emoji: '🧵', rarity: 'common', sources: ['shop', 'craft'] },
    steel: { name: 'Steel Ingot', emoji: '⚪', rarity: 'uncommon', sources: ['smelt', 'shop'] },
    crystal: { name: 'Magic Crystal', emoji: '💎', rarity: 'rare', sources: ['mine', 'dungeon'] },
    gem: { name: 'Precious Gem', emoji: '💍', rarity: 'rare', sources: ['mine', 'treasure'] },
    dragon_scale: { name: 'Dragon Scale', emoji: '🐉', rarity: 'legendary', sources: ['battle', 'dungeon'] },
    mythril: { name: 'Mythril', emoji: '✨', rarity: 'legendary', sources: ['deep_mine', 'quest'] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('🔨 Craft powerful equipment and useful items!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose crafting action')
                .setRequired(false)
                .addChoices(
                    { name: '🔨 Craft Item', value: 'craft' },
                    { name: '📋 View Recipes', value: 'recipes' },
                    { name: '📦 Check Materials', value: 'materials' },
                    { name: '🏗️ Crafting Station', value: 'station' }
                ))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Item category to craft or view')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Potions', value: 'potions' },
                    { name: '💍 Accessories', value: 'accessories' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Specific item to craft')
                .setRequired(false)),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'station';
        const category = interaction.options?.getString('category');
        const itemName = interaction.options?.getString('item');
        const userId = interaction.user.id;
        
        switch (action) {
            case 'craft':
                await this.craftItem(interaction, itemName, category);
                break;
            case 'recipes':
                await this.showRecipes(interaction, category);
                break;
            case 'materials':
                await this.showMaterials(interaction);
                break;
            default:
                await this.showCraftingStation(interaction);
        }
    },
    
    async showCraftingStation(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || {
            inventory: { items: [] },
            crafting: { level: 1, experience: 0, recipes: [] },
            stats: { level: 1 }
        };
        
        const craftingData = userData.crafting || { level: 1, experience: 0, recipes: [] };
        const userLevel = userData.stats?.level || 1;
        const materials = this.getUserMaterials(userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('🏗️ Master Crafting Station')
            .setDescription('**Welcome to your personal workshop!**\nCraft powerful equipment, useful tools, and magical items.')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '🔨 Crafting Mastery',
                    value: `⭐ Crafting Level: **${craftingData.level}**\n🎯 Experience: **${craftingData.experience}**\n📖 Known Recipes: **${craftingData.recipes?.length || 0}**`,
                    inline: true
                },
                {
                    name: '📦 Available Materials',
                    value: `🪵 Wood: **${materials.wood || 0}**\n⚫ Iron: **${materials.iron || 0}**\n🟤 Leather: **${materials.leather || 0}**\n💎 Crystals: **${materials.crystal || 0}**`,
                    inline: true
                },
                {
                    name: '🎮 Quick Actions',
                    value: '• View recipes by category\n• Check required materials\n• Craft available items\n• Learn new recipes',
                    inline: true
                }
            ]);
            
        // Show craftable items summary
        const craftableWeapons = this.getCraftableItems(userData, 'weapons');
        const craftableArmor = this.getCraftableItems(userData, 'armor');
        const craftableTools = this.getCraftableItems(userData, 'tools');
        const craftablePotions = this.getCraftableItems(userData, 'potions');
        
        embed.addFields([
            {
                name: '🔨 Available Crafting Options',
                value: `⚔️ Weapons: **${craftableWeapons.length}** craftable\n🛡️ Armor: **${craftableArmor.length}** craftable\n🔧 Tools: **${craftableTools.length}** craftable\n🧪 Potions: **${craftablePotions.length}** craftable\n💍 Accessories: **${this.getCraftableItems(userData, 'accessories').length}** craftable`,
                inline: false
            }
        ]);
        
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('craft_category_select')
            .setPlaceholder('🔨 Select a crafting category...')
            .addOptions([
                {
                    label: 'Weapons & Combat Gear',
                    description: `${craftableWeapons.length} items available to craft`,
                    value: 'craft_weapons',
                    emoji: '⚔️'
                },
                {
                    label: 'Armor & Protection',
                    description: `${craftableArmor.length} items available to craft`,
                    value: 'craft_armor',
                    emoji: '🛡️'
                },
                {
                    label: 'Tools & Utilities',
                    description: `${craftableTools.length} items available to craft`,
                    value: 'craft_tools',
                    emoji: '🔧'
                },
                {
                    label: 'Potions & Consumables',
                    description: `${craftablePotions.length} items available to craft`,
                    value: 'craft_potions',
                    emoji: '🧪'
                },
                {
                    label: 'Accessories & Jewelry',
                    description: `${this.getCraftableItems(userData, 'accessories').length} items available to craft`,
                    value: 'craft_accessories',
                    emoji: '💍'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_quick_craft')
                    .setLabel('⚡ Quick Craft')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('craft_materials')
                    .setLabel('📦 My Materials')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('craft_recipes')
                    .setLabel('📖 Recipe Book')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('gather_materials')
                    .setLabel('🌿 Gather Materials')
                    .setStyle(ButtonStyle.Success)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async showRecipes(interaction, category) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { crafting: { level: 1 } };
        const craftingLevel = userData.crafting?.level || 1;
        
        if (!category) {
            // Show all categories
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('📖 Complete Recipe Collection')
                .setDescription('**Master Craftsman\'s Recipe Book**\nAll available crafting recipes organized by category.')
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
                
            Object.entries(recipes).forEach(([cat, recipeList]) => {
                const availableRecipes = recipeList.filter(recipe => craftingLevel >= recipe.level);
                const totalRecipes = recipeList.length;
                
                embed.addFields([{
                    name: `${this.getCategoryEmoji(cat)} ${this.getCategoryName(cat)}`,
                    value: `📋 Available: **${availableRecipes.length}/${totalRecipes}** recipes\n🎯 Level Range: ${Math.min(...recipeList.map(r => r.level))} - ${Math.max(...recipeList.map(r => r.level))}\n💡 ${this.getCategoryDescription(cat)}`,
                    inline: true
                }]);
            });
            
            embed.addFields([
                {
                    name: '🎓 Crafting Progression',
                    value: `Your Level: **${craftingLevel}**\nUnlock new recipes by increasing your crafting level through practice!`,
                    inline: false
                }
            ]);
            
        } else {
            // Show specific category
            const categoryRecipes = recipes[category] || [];
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle(`${this.getCategoryEmoji(category)} ${this.getCategoryName(category)} Recipes`)
                .setDescription(`**${categoryRecipes.length} recipes available in this category**`)
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
                
            categoryRecipes.forEach(recipe => {
                const canCraft = craftingLevel >= recipe.level;
                const materials = Object.entries(recipe.materials).map(([mat, qty]) => 
                    `${materials[mat]?.emoji || '📦'} ${qty}x ${materials[mat]?.name || mat}`
                ).join(', ');
                
                const stats = Object.entries(recipe.stats).map(([stat, value]) => 
                    `+${value} ${stat}`
                ).join(', ');
                
                embed.addFields([{
                    name: `${recipe.emoji} ${recipe.name} ${canCraft ? '✅' : '🔒'}`,
                    value: `**Level ${recipe.level} Required**\n📦 Materials: ${materials}\n⚡ Stats: ${stats}${canCraft ? '' : '\n❌ Crafting level too low'}`,
                    inline: true
                }]);
            });
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_station')
                    .setLabel('← Back to Crafting')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('craft_materials_guide')
                    .setLabel('📦 Material Guide')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    async craftItem(interaction, itemName, category) {
        const userId = interaction.user.id;
        
        if (!itemName && !category) {
            return interaction.reply({
                content: '❌ Please specify an item to craft or select a category!',
                ephemeral: true
            });
        }
        
        // Find the recipe
        let recipe = null;
        let recipeCategory = null;
        
        if (itemName) {
            for (const [cat, recipeList] of Object.entries(recipes)) {
                const found = recipeList.find(r => 
                    r.id === itemName.toLowerCase() || 
                    r.name.toLowerCase() === itemName.toLowerCase()
                );
                if (found) {
                    recipe = found;
                    recipeCategory = cat;
                    break;
                }
            }
        }
        
        if (!recipe) {
            return interaction.reply({
                content: '❌ Recipe not found! Use `/craft recipes` to see available recipes.',
                ephemeral: true
            });
        }
        
        const userData = await db.getPlayer(userId) || {
            inventory: { items: [] },
            crafting: { level: 1, experience: 0 }
        };
        
        const craftingLevel = userData.crafting?.level || 1;
        const userMaterials = this.getUserMaterials(userData);
        
        // Check crafting level
        if (craftingLevel < recipe.level) {
            return interaction.reply({
                content: `❌ Your crafting level (${craftingLevel}) is too low! You need level ${recipe.level} to craft ${recipe.name}.`,
                ephemeral: true
            });
        }
        
        // Check materials
        const missingMaterials = [];
        for (const [material, required] of Object.entries(recipe.materials)) {
            const available = userMaterials[material] || 0;
            if (available < required) {
                missingMaterials.push(`${materials[material]?.emoji || '📦'} ${required - available}x ${materials[material]?.name || material}`);
            }
        }
        
        if (missingMaterials.length > 0) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Insufficient Materials')
                .setDescription(`You need more materials to craft **${recipe.name}**`)
                .addFields([
                    { name: '📦 Missing Materials', value: missingMaterials.join('\n'), inline: false },
                    { name: '💡 How to Obtain', value: 'Use `/mine`, `/forage`, `/hunt`, or visit the `/shop` to get materials!', inline: false }
                ]);
                
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // Craft the item
        for (const [material, required] of Object.entries(recipe.materials)) {
            this.removeMaterial(userData, material, required);
        }
        
        // Add crafted item to inventory
        if (!userData.inventory.items) userData.inventory.items = [];
        userData.inventory.items.push({
            id: recipe.id,
            name: recipe.name,
            category: recipeCategory,
            stats: recipe.stats,
            crafted: true,
            craftedDate: Date.now(),
            emoji: recipe.emoji
        });
        
        // Add crafting experience
        const expGain = recipe.level * 10;
        userData.crafting.experience = (userData.crafting.experience || 0) + expGain;
        
        // Check for level up
        const newLevel = Math.floor(userData.crafting.experience / 100) + 1;
        const leveledUp = newLevel > userData.crafting.level;
        if (leveledUp) {
            userData.crafting.level = newLevel;
        }
        
        await db.setUser(userId, userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle('🔨 Crafting Successful!')
            .setDescription(`You have successfully crafted **${recipe.name}**!`)
            .addFields([
                { name: '🎁 Item Crafted', value: `${recipe.emoji} ${recipe.name}`, inline: true },
                { name: '⚡ Item Stats', value: Object.entries(recipe.stats).map(([stat, value]) => `+${value} ${stat}`).join('\n'), inline: true },
                { name: '🎯 Experience Gained', value: `+${expGain} crafting XP`, inline: true }
            ])
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .setTimestamp();
            
        if (leveledUp) {
            embed.addFields([
                { name: '🎉 Level Up!', value: `Your crafting level increased to **${newLevel}**!\nNew recipes unlocked!`, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_again')
                    .setLabel('🔨 Craft Another')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('equip_item')
                    .setLabel('⚡ Equip Item')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    getUserMaterials(userData) {
        const materials = {};
        const items = userData.inventory?.items || [];
        
        items.forEach(item => {
            if (item.category === 'materials' || item.material) {
                const materialType = item.material || item.id;
                materials[materialType] = (materials[materialType] || 0) + (item.quantity || 1);
            }
        });
        
        return materials;
    },
    
    removeMaterial(userData, material, quantity) {
        const items = userData.inventory?.items || [];
        let remaining = quantity;
        
        for (let i = items.length - 1; i >= 0 && remaining > 0; i--) {
            const item = items[i];
            if ((item.material || item.id) === material) {
                const itemQuantity = item.quantity || 1;
                if (itemQuantity <= remaining) {
                    remaining -= itemQuantity;
                    items.splice(i, 1);
                } else {
                    item.quantity = itemQuantity - remaining;
                    remaining = 0;
                }
            }
        }
    },
    
    getCraftableItems(userData, category) {
        const categoryRecipes = recipes[category] || [];
        const craftingLevel = userData.crafting?.level || 1;
        const userMaterials = this.getUserMaterials(userData);
        
        return categoryRecipes.filter(recipe => {
            if (craftingLevel < recipe.level) return false;
            
            for (const [material, required] of Object.entries(recipe.materials)) {
                if ((userMaterials[material] || 0) < required) return false;
            }
            
            return true;
        });
    },
    
    getCategoryName(category) {
        const names = {
            weapons: 'Weapons & Combat Gear',
            armor: 'Armor & Protection',
            tools: 'Tools & Utilities',
            potions: 'Potions & Consumables',
            accessories: 'Accessories & Jewelry'
        };
        return names[category] || 'Unknown Category';
    },
    
    getCategoryEmoji(category) {
        const emojis = {
            weapons: '⚔️',
            armor: '🛡️',
            tools: '🔧',
            potions: '🧪',
            accessories: '💍'
        };
        return emojis[category] || '📦';
    },
    
    getCategoryDescription(category) {
        const descriptions = {
            weapons: 'Swords, axes, and magical weapons',
            armor: 'Protection for dangerous adventures',
            tools: 'Utility items for exploration',
            potions: 'Temporary boosts and healing',
            accessories: 'Rings, amulets, and enhancers'
        };
        return descriptions[category] || 'Various crafted items';
    }
};