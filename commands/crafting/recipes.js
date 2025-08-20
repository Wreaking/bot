const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Define crafting categories and their recipes
const craftingRecipes = {
    weapons: {
        emoji: '⚔️',
        items: {
            'iron_sword': {
                name: 'Iron Sword',
                materials: { 'iron_ingot': 3, 'wood': 1 },
                level: 1,
                experience: 25,
                value: 100
            },
            'steel_blade': {
                name: 'Steel Blade',
                materials: { 'steel_ingot': 4, 'leather': 1 },
                level: 3,
                experience: 50,
                value: 250
            },
            'mythril_rapier': {
                name: 'Mythril Rapier',
                materials: { 'mythril_ingot': 3, 'magic_essence': 2 },
                level: 5,
                experience: 100,
                value: 500
            }
        }
    },
    armor: {
        emoji: '🛡️',
        items: {
            'leather_armor': {
                name: 'Leather Armor',
                materials: { 'leather': 5, 'thread': 2 },
                level: 1,
                experience: 30,
                value: 120
            },
            'iron_platemail': {
                name: 'Iron Platemail',
                materials: { 'iron_ingot': 5, 'leather': 2 },
                level: 3,
                experience: 60,
                value: 300
            },
            'mythril_armor': {
                name: 'Mythril Armor',
                materials: { 'mythril_ingot': 6, 'magic_cloth': 3 },
                level: 5,
                experience: 120,
                value: 600
            }
        }
    },
    accessories: {
        emoji: '💍',
        items: {
            'lucky_charm': {
                name: 'Lucky Charm',
                materials: { 'silver_ingot': 1, 'magic_dust': 2 },
                level: 2,
                experience: 40,
                value: 150
            },
            'power_ring': {
                name: 'Power Ring',
                materials: { 'gold_ingot': 2, 'ruby': 1 },
                level: 4,
                experience: 80,
                value: 400
            },
            'amulet_of_protection': {
                name: 'Amulet of Protection',
                materials: { 'mythril_ingot': 1, 'diamond': 1, 'magic_essence': 3 },
                level: 6,
                experience: 150,
                value: 800
            }
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recipes')
        .setDescription('📖 Browse and learn crafting recipes')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Type of recipes to view')
                .setRequired(true)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessories', value: 'accessories' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const category = interaction.options.getString('category');
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                craftingLevel: 1,
                inventory: {},
                recipes: []
            };

            const recipes = craftingRecipes[category];
            if (!recipes) {
                await interaction.editReply({
                    content: '❌ Invalid category selected.',
                    ephemeral: true
                });
                return;
            }

            // Create recipe list embed
            const embed = new EmbedBuilder()
                .setColor('#CD853F')
                .setTitle(`${recipes.emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Recipes`)
                .setDescription('Select a recipe to view detailed information.')
                .setFooter({ text: `Crafting Level: ${player.craftingLevel || 1}` });

            // Add recipe entries
            Object.entries(recipes.items).forEach(([id, recipe]) => {
                const canCraft = (player.craftingLevel || 1) >= recipe.level;
                const status = canCraft ? '✅' : '🔒';
                embed.addFields({
                    name: `${status} ${recipe.name}`,
                    value: `Level ${recipe.level} | Value: ${recipe.value} coins`,
                    inline: true
                });
            });

            // Create recipe selection menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('recipe_select')
                .setPlaceholder('Select a recipe to view details')
                .addOptions(Object.entries(recipes.items).map(([id, recipe]) => ({
                    label: recipe.name,
                    description: `Level ${recipe.level} | ${Object.entries(recipe.materials)[0][0]} + ...`,
                    value: `${category}_${id}`,
                    emoji: (player.craftingLevel || 1) >= recipe.level ? '📖' : '🔒'
                })));

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            // Add learn button for unlocked recipes
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('learn_recipe')
                        .setLabel('Learn Selected Recipe')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📚'),
                    new ButtonBuilder()
                        .setCustomId('craft_selected')
                        .setLabel('Craft Selected Item')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('⚒️')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row, buttons]
            });

        } catch (error) {
            console.error('Error in recipes command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while viewing recipes.',
                ephemeral: true
            });
        }
    },
};
