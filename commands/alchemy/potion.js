const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Enhanced potion recipes with more detailed information
const potionCategories = {
    health: {
        name: '❤️ Health Potions',
        emoji: '❤️',
        description: 'Restore health points instantly',
        recipes: {
            minor: { 
                name: 'Minor Health Potion', 
                ingredients: { herb: 2, water: 1 }, 
                heal: 20, 
                cost: 50,
                level: 1,
                exp: 10,
                description: 'A basic healing potion for minor wounds',
                rarity: 'Common'
            },
            greater: { 
                name: 'Greater Health Potion', 
                ingredients: { herb: 4, mushroom: 2, water: 2 }, 
                heal: 50, 
                cost: 150,
                level: 5,
                exp: 25,
                description: 'A potent healing draught for serious injuries',
                rarity: 'Uncommon'
            },
            superior: { 
                name: 'Superior Health Potion', 
                ingredients: { herb: 6, mushroom: 3, crystal: 1, pure_water: 1 }, 
                heal: 100, 
                cost: 300,
                level: 10,
                exp: 50,
                description: 'The pinnacle of healing magic in liquid form',
                rarity: 'Rare'
            }
        }
    },
    mana: {
        name: '💙 Mana Potions',
        emoji: '💙',
        description: 'Restore magical energy',
        recipes: {
            minor: { 
                name: 'Minor Mana Potion', 
                ingredients: { crystal: 1, moonwater: 1 }, 
                mana: 20, 
                cost: 75,
                level: 1,
                exp: 10,
                description: 'Restores a small amount of magical energy',
                rarity: 'Common'
            },
            greater: { 
                name: 'Greater Mana Potion', 
                ingredients: { crystal: 2, gem: 1, moonwater: 2 }, 
                mana: 50, 
                cost: 200,
                level: 5,
                exp: 25,
                description: 'A powerful elixir that replenishes magical reserves',
                rarity: 'Uncommon'
            },
            superior: { 
                name: 'Superior Mana Potion', 
                ingredients: { crystal: 3, gem: 2, essence: 1, starwater: 1 }, 
                mana: 100, 
                cost: 400,
                level: 10,
                exp: 50,
                description: 'The ultimate magical restoration potion',
                rarity: 'Rare'
            }
        }
    },
    buff: {
        name: '⚡ Enhancement Potions',
        emoji: '⚡',
        description: 'Temporary stat boosts',
        recipes: {
            strength: { 
                name: 'Strength Potion', 
                ingredients: { mushroom: 3, essence: 1, dragon_blood: 1 }, 
                effect: 'Attack +15%', 
                duration: 3600, 
                cost: 250,
                level: 7,
                exp: 30,
                description: 'Enhances physical strength and combat prowess',
                rarity: 'Uncommon'
            },
            defense: { 
                name: 'Defense Potion', 
                ingredients: { herb: 3, crystal: 1, stone_essence: 1 }, 
                effect: 'Defense +15%', 
                duration: 3600, 
                cost: 250,
                level: 7,
                exp: 30,
                description: 'Hardens skin and increases resistance to damage',
                rarity: 'Uncommon'
            },
            speed: { 
                name: 'Speed Potion', 
                ingredients: { herb: 2, essence: 1, wind_feather: 2 }, 
                effect: 'Speed +15%', 
                duration: 3600, 
                cost: 250,
                level: 7,
                exp: 30,
                description: 'Increases agility and movement speed',
                rarity: 'Uncommon'
            },
            intelligence: {
                name: 'Intelligence Potion',
                ingredients: { crystal: 2, essence: 2, ancient_tome: 1 },
                effect: 'Magic Power +20%',
                duration: 3600,
                cost: 350,
                level: 12,
                exp: 40,
                description: 'Enhances magical abilities and spell potency',
                rarity: 'Rare'
            }
        }
    },
    special: {
        name: '🌟 Special Potions',
        emoji: '🌟',
        description: 'Unique magical effects',
        recipes: {
            invisibility: {
                name: 'Invisibility Potion',
                ingredients: { shadow_essence: 2, ghost_flower: 1, void_crystal: 1 },
                effect: 'Become invisible',
                duration: 1800,
                cost: 500,
                level: 15,
                exp: 60,
                description: 'Grants temporary invisibility to the drinker',
                rarity: 'Epic'
            },
            levitation: {
                name: 'Levitation Potion',
                ingredients: { air_essence: 3, cloud_dust: 2, phoenix_feather: 1 },
                effect: 'Levitate above ground',
                duration: 1200,
                cost: 400,
                level: 12,
                exp: 45,
                description: 'Allows the user to float and move through the air',
                rarity: 'Rare'
            },
            nightvision: {
                name: 'Night Vision Potion',
                ingredients: { bat_wing: 2, glowing_mushroom: 3, dark_crystal: 1 },
                effect: 'See in complete darkness',
                duration: 7200,
                cost: 300,
                level: 8,
                exp: 35,
                description: 'Grants perfect vision in the darkest environments',
                rarity: 'Uncommon'
            }
        }
    }
};

// Rarity colors for embeds
const rarityColors = {
    'Common': '#808080',
    'Uncommon': '#00FF00',
    'Rare': '#0080FF',
    'Epic': '#8000FF',
    'Legendary': '#FFD700'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('potion')
        .setDescription('🧪 Create magical potions with an interactive crafting system'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            // Get user profile
            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.reply({
                    content: '❌ You need to create a profile first! Use `/profile` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Helper functions
            const getPlayerAlchemyLevel = () => {
                return player.skills?.alchemy?.level || player.skills?.alchemy || 1;
            };

            const getPlayerAlchemyExp = () => {
                return player.skills?.alchemy?.exp || player.skillExperience?.alchemy || 0;
            };

            const hasRequiredMaterials = (recipe, amount = 1) => {
                for (const [material, required] of Object.entries(recipe.ingredients)) {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    if (playerAmount < required * amount) {
                        return false;
                    }
                }
                return true;
            };

            const getMissingMaterials = (recipe, amount = 1) => {
                const missing = [];
                for (const [material, required] of Object.entries(recipe.ingredients)) {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    const totalRequired = required * amount;
                    if (playerAmount < totalRequired) {
                        missing.push({
                            name: material,
                            have: playerAmount,
                            need: totalRequired,
                            missing: totalRequired - playerAmount
                        });
                    }
                }
                return missing;
            };

            const canCraftPotion = (recipe, amount = 1) => {
                const alchemyLevel = getPlayerAlchemyLevel();
                const hasLevel = alchemyLevel >= recipe.level;
                const hasMaterials = hasRequiredMaterials(recipe, amount);
                const hasCoins = (player.coins || 0) >= (recipe.cost * amount);
                return hasLevel && hasMaterials && hasCoins;
            };

            // Create main menu embed
            const createMainMenuEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor('#9400D3')
                    .setTitle('🧪 Master Alchemist\'s Workshop')
                    .setDescription('*Welcome to the most advanced potion crafting laboratory!*\n\nSelect a potion category to explore available recipes.')
                    .addFields(
                        {
                            name: '👤 Your Alchemy Stats',
                            value: `**Level:** ${getPlayerAlchemyLevel()}\n**Experience:** ${getPlayerAlchemyExp()} XP\n**Next Level:** ${(getPlayerAlchemyLevel() * 100) - getPlayerAlchemyExp()} XP`,
                            inline: true
                        },
                        {
                            name: '💰 Resources',
                            value: `**Coins:** ${player.coins || 0}\n**Potions Crafted:** ${player.potionsCrafted || 0}`,
                            inline: true
                        },
                        {
                            name: '🎯 Categories Available',
                            value: Object.keys(potionCategories).length.toString(),
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Choose a category to see available recipes' })
                    .setTimestamp();

                return embed;
            };

            // Create category selection menu
            const createCategoryMenu = () => {
                const options = Object.entries(potionCategories).map(([key, category]) => ({
                    label: category.name,
                    description: category.description,
                    value: key,
                    emoji: category.emoji
                }));

                return new StringSelectMenuBuilder()
                    .setCustomId('select_category')
                    .setPlaceholder('Choose a potion category...')
                    .addOptions(options);
            };

            // Create category embed
            const createCategoryEmbed = (categoryKey) => {
                const category = potionCategories[categoryKey];
                const alchemyLevel = getPlayerAlchemyLevel();

                const embed = new EmbedBuilder()
                    .setColor('#9400D3')
                    .setTitle(`${category.emoji} ${category.name}`)
                    .setDescription(`*${category.description}*\n\nSelect a potion to craft or view details.`)
                    .setFooter({ text: `Your Alchemy Level: ${alchemyLevel} | Available recipes: ${Object.keys(category.recipes).length}` });

                // Add recipe overview
                const recipeList = Object.entries(category.recipes).map(([key, recipe]) => {
                    const canCraft = canCraftPotion(recipe, 1);
                    const levelReq = recipe.level <= alchemyLevel ? '✅' : '❌';
                    const status = canCraft ? '🟢 Ready' : '🔴 Missing requirements';
                    
                    return `${levelReq} **${recipe.name}** (Lv.${recipe.level})\n└ ${status} • ${recipe.rarity}`;
                }).join('\n\n');

                embed.addFields({
                    name: '📜 Available Recipes',
                    value: recipeList || 'No recipes available',
                    inline: false
                });

                return embed;
            };

            // Create potion detail embed
            const createPotionDetailEmbed = (categoryKey, potionKey, amount = 1) => {
                const category = potionCategories[categoryKey];
                const recipe = category.recipes[potionKey];
                const canCraft = canCraftPotion(recipe, amount);
                const missingMaterials = getMissingMaterials(recipe, amount);
                const alchemyLevel = getPlayerAlchemyLevel();

                const embed = new EmbedBuilder()
                    .setColor(rarityColors[recipe.rarity] || '#9400D3')
                    .setTitle(`${category.emoji} ${recipe.name}`)
                    .setDescription(`*${recipe.description}*`)
                    .addFields(
                        {
                            name: '🏷️ Recipe Information',
                            value: `**Rarity:** ${recipe.rarity}\n**Required Level:** ${recipe.level}\n**Your Level:** ${alchemyLevel}`,
                            inline: true
                        },
                        {
                            name: '💰 Costs',
                            value: `**Per Potion:** ${recipe.cost} coins\n**Total Cost:** ${recipe.cost * amount} coins`,
                            inline: true
                        }
                    );

                // Add effect information
                if (recipe.heal) {
                    embed.addFields({
                        name: '❤️ Healing Effect',
                        value: `**Heals:** ${recipe.heal} HP\n**Total Healing:** ${recipe.heal * amount} HP`,
                        inline: true
                    });
                } else if (recipe.mana) {
                    embed.addFields({
                        name: '💙 Mana Effect',
                        value: `**Restores:** ${recipe.mana} MP\n**Total Restoration:** ${recipe.mana * amount} MP`,
                        inline: true
                    });
                } else if (recipe.effect) {
                    embed.addFields({
                        name: '⚡ Enhancement Effect',
                        value: `**Effect:** ${recipe.effect}\n**Duration:** ${Math.floor(recipe.duration / 60)} minutes`,
                        inline: true
                    });
                }

                // Add ingredients list
                const ingredientsList = Object.entries(recipe.ingredients).map(([material, required]) => {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    const totalRequired = required * amount;
                    const hasEnough = playerAmount >= totalRequired;
                    const status = hasEnough ? '✅' : '❌';
                    return `${status} **${material}**: ${playerAmount}/${totalRequired}`;
                }).join('\n');

                embed.addFields({
                    name: '🧪 Required Ingredients',
                    value: ingredientsList,
                    inline: false
                });

                // Add experience reward
                embed.addFields({
                    name: '📈 Rewards',
                    value: `**Experience:** ${recipe.exp * amount} XP\n**Alchemy Level:** ${recipe.level} required`,
                    inline: true
                });

                // Add missing requirements if any
                if (!canCraft) {
                    let missingText = '';
                    
                    if (alchemyLevel < recipe.level) {
                        missingText += `❌ **Level Requirement:** Need level ${recipe.level} (currently ${alchemyLevel})\n`;
                    }
                    
                    if (missingMaterials.length > 0) {
                        missingText += `❌ **Missing Materials:**\n${missingMaterials.map(m => 
                            `• ${m.name}: need ${m.missing} more`
                        ).join('\n')}\n`;
                    }
                    
                    const totalCost = recipe.cost * amount;
                    if ((player.coins || 0) < totalCost) {
                        missingText += `❌ **Insufficient Funds:** Need ${totalCost - (player.coins || 0)} more coins`;
                    }

                    if (missingText) {
                        embed.addFields({
                            name: '⚠️ Requirements Not Met',
                            value: missingText,
                            inline: false
                        });
                    }
                }

                return embed;
            };

            // Create action buttons for potion crafting
            const createCraftingButtons = (categoryKey, potionKey, amount = 1) => {
                const recipe = potionCategories[categoryKey].recipes[potionKey];
                const canCraft = canCraftPotion(recipe, amount);

                const buttons = [];
                
                // Amount adjustment buttons
                if (amount > 1) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`amount_decrease_${categoryKey}_${potionKey}_${amount}`)
                            .setLabel('-1')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('➖')
                    );
                }

                // Current amount display button (disabled)
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('amount_display')
                        .setLabel(`Amount: ${amount}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                if (amount < 10) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`amount_increase_${categoryKey}_${potionKey}_${amount}`)
                            .setLabel('+1')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('➕')
                    );
                }

                const row1 = new ActionRowBuilder().addComponents(buttons);

                // Action buttons
                const craftButton = new ButtonBuilder()
                    .setCustomId(`craft_${categoryKey}_${potionKey}_${amount}`)
                    .setLabel(`Craft ${amount}x ${recipe.name}`)
                    .setStyle(canCraft ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji('🧪')
                    .setDisabled(!canCraft);

                const backButton = new ButtonBuilder()
                    .setCustomId(`back_to_category_${categoryKey}`)
                    .setLabel('Back to Category')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const mainMenuButton = new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('Main Menu')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠');

                const row2 = new ActionRowBuilder().addComponents(craftButton, backButton, mainMenuButton);

                return [row1, row2];
            };

            // Send initial response
            const mainEmbed = createMainMenuEmbed();
            const categoryMenu = createCategoryMenu();
            const menuRow = new ActionRowBuilder().addComponents(categoryMenu);

            const response = await interaction.reply({
                embeds: [mainEmbed],
                components: [menuRow]
            });

            // Create collector for interactions
            const collector = response.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (componentInteraction) => {
                // Check if the user is the same as the command user
                if (componentInteraction.user.id !== userId) {
                    return componentInteraction.reply({
                        content: '❌ You cannot interact with someone else\'s potion crafting session!',
                        ephemeral: true
                    });
                }

                try {
                    await componentInteraction.deferUpdate();
                    
                    // Refresh player data
                    player = await db.getPlayer(userId) || player;

                    if (componentInteraction.customId === 'back_to_main') {
                        // Return to main menu
                        const embed = createMainMenuEmbed();
                        const menu = createCategoryMenu();
                        const row = new ActionRowBuilder().addComponents(menu);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [row]
                        });

                    } else if (componentInteraction.customId === 'select_category') {
                        // Show category recipes
                        const categoryKey = componentInteraction.values[0];
                        const embed = createCategoryEmbed(categoryKey);
                        
                        // Create recipe selection menu
                        const recipes = potionCategories[categoryKey].recipes;
                        const recipeOptions = Object.entries(recipes).map(([key, recipe]) => {
                            const canCraft = canCraftPotion(recipe, 1);
                            const alchemyLevel = getPlayerAlchemyLevel();
                            
                            return {
                                label: recipe.name,
                                description: `${recipe.rarity} • Lv.${recipe.level} • ${recipe.cost} coins`,
                                value: `${categoryKey}_${key}`,
                                emoji: canCraft ? '✅' : (alchemyLevel < recipe.level ? '🔒' : '❌')
                            };
                        });

                        const recipeMenu = new StringSelectMenuBuilder()
                            .setCustomId('select_recipe')
                            .setPlaceholder('Choose a recipe to craft...')
                            .addOptions(recipeOptions);

                        const backButton = new ButtonBuilder()
                            .setCustomId('back_to_main')
                            .setLabel('Back to Main Menu')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️');

                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder().addComponents(recipeMenu),
                                new ActionRowBuilder().addComponents(backButton)
                            ]
                        });

                    } else if (componentInteraction.customId === 'select_recipe') {
                        // Show recipe details
                        const [categoryKey, potionKey] = componentInteraction.values[0].split('_');
                        const embed = createPotionDetailEmbed(categoryKey, potionKey, 1);
                        const buttons = createCraftingButtons(categoryKey, potionKey, 1);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: buttons
                        });

                    } else if (componentInteraction.customId.startsWith('amount_')) {
                        // Handle amount changes
                        const parts = componentInteraction.customId.split('_');
                        const action = parts[1]; // increase or decrease
                        const categoryKey = parts[2];
                        const potionKey = parts[3];
                        let amount = parseInt(parts[4]);

                        if (action === 'increase' && amount < 10) {
                            amount++;
                        } else if (action === 'decrease' && amount > 1) {
                            amount--;
                        }

                        const embed = createPotionDetailEmbed(categoryKey, potionKey, amount);
                        const buttons = createCraftingButtons(categoryKey, potionKey, amount);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: buttons
                        });

                    } else if (componentInteraction.customId.startsWith('craft_')) {
                        // Handle crafting
                        const parts = componentInteraction.customId.split('_');
                        const categoryKey = parts[1];
                        const potionKey = parts[2];
                        const amount = parseInt(parts[3]);
                        
                        const recipe = potionCategories[categoryKey].recipes[potionKey];
                        
                        if (!canCraftPotion(recipe, amount)) {
                            const errorEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Crafting Failed')
                                .setDescription('You don\'t meet the requirements for this recipe!')
                                .setFooter({ text: 'Check the recipe requirements and try again.' });

                            const backButton = new ButtonBuilder()
                                .setCustomId(`back_to_category_${categoryKey}`)
                                .setLabel('Back')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️');

                            await componentInteraction.editReply({
                                embeds: [errorEmbed],
                                components: [new ActionRowBuilder().addComponents(backButton)]
                            });
                            return;
                        }

                        // Process crafting
                        const totalCost = recipe.cost * amount;
                        const expGained = recipe.exp * amount;

                        // Update materials
                        if (!player.inventory) player.inventory = {};
                        if (!player.inventory.materials) player.inventory.materials = {};
                        if (!player.items) player.items = {};

                        // Remove materials
                        for (const [material, required] of Object.entries(recipe.ingredients)) {
                            if (player.inventory.materials[material]) {
                                player.inventory.materials[material] -= required * amount;
                            } else if (player.items[material]) {
                                player.items[material] -= required * amount;
                            }
                        }

                        // Remove coins
                        player.coins = (player.coins || 0) - totalCost;

                        // Add potions to inventory
                        if (!player.inventory.potions) player.inventory.potions = {};
                        const potionKey_full = `${categoryKey}_${potionKey}`;
                        player.inventory.potions[potionKey_full] = (player.inventory.potions[potionKey_full] || 0) + amount;

                        // Update alchemy skill
                        if (!player.skills) player.skills = {};
                        if (!player.skillExperience) player.skillExperience = {};
                        
                        const currentExp = player.skillExperience.alchemy || 0;
                        const newExp = currentExp + expGained;
                        const currentLevel = player.skills.alchemy || 1;
                        const newLevel = Math.floor(newExp / 100) + 1;

                        player.skillExperience.alchemy = newExp;
                        player.skills.alchemy = Math.max(newLevel, currentLevel);
                        player.potionsCrafted = (player.potionsCrafted || 0) + amount;

                        // Save to database
                        await db.updatePlayer(userId, player);

                        // Create success embed
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✨ Crafting Successful!')
                            .setDescription(`You successfully crafted ${amount}x **${recipe.name}**!`)
                            .addFields(
                                {
                                    name: '🎁 Rewards',
                                    value: `**Potions Added:** ${amount}x ${recipe.name}\n**Experience Gained:** +${expGained} XP${newLevel > currentLevel ? `\n🎊 **Level Up!** Alchemy level is now ${newLevel}` : ''}`,
                                    inline: false
                                },
                                {
                                    name: '📊 Updated Stats',
                                    value: `**Remaining Coins:** ${player.coins}\n**Alchemy Level:** ${player.skills.alchemy}\n**Total Potions Crafted:** ${player.potionsCrafted}`,
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Your potions have been added to your inventory!' })
                            .setTimestamp();

                        const continueButton = new ButtonBuilder()
                            .setCustomId('back_to_main')
                            .setLabel('Continue Crafting')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🧪');

                        await componentInteraction.editReply({
                            embeds: [successEmbed],
                            components: [new ActionRowBuilder().addComponents(continueButton)]
                        });

                    } else if (componentInteraction.customId.startsWith('back_to_category_')) {
                        // Return to category view
                        const categoryKey = componentInteraction.customId.replace('back_to_category_', '');
                        const embed = createCategoryEmbed(categoryKey);
                        
                        // Recreate recipe selection menu
                        const recipes = potionCategories[categoryKey].recipes;
                        const recipeOptions = Object.entries(recipes).map(([key, recipe]) => {
                            const canCraft = canCraftPotion(recipe, 1);
                            const alchemyLevel = getPlayerAlchemyLevel();
                            
                            return {
                                label: recipe.name,
                                description: `${recipe.rarity} • Lv.${recipe.level} • ${recipe.cost} coins`,
                                value: `${categoryKey}_${key}`,
                                emoji: canCraft ? '✅' : (alchemyLevel < recipe.level ? '🔒' : '❌')
                            };
                        });

                        const recipeMenu = new StringSelectMenuBuilder()
                            .setCustomId('select_recipe')
                            .setPlaceholder('Choose a recipe to craft...')
                            .addOptions(recipeOptions);

                        const backButton = new ButtonBuilder()
                            .setCustomId('back_to_main')
                            .setLabel('Back to Main Menu')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️');

                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder().addComponents(recipeMenu),
                                new ActionRowBuilder().addComponents(backButton)
                            ]
                        });
                    }

                } catch (error) {
                    console.error('Potion interaction error:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ An Error Occurred')
                        .setDescription('Something went wrong while processing your request. Please try again.');

                    const backButton = new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('Back to Main Menu')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️');

                    await componentInteraction.editReply({
                        embeds: [errorEmbed],
                        components: [new ActionRowBuilder().addComponents(backButton)]
                    }).catch(() => {});
                }
            });

            collector.on('end', async () => {
                try {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('🧪 Crafting Session Expired')
                        .setDescription('This potion crafting session has timed out. Use `/potion` again to start a new session.')
                        .setFooter({ text: 'Session lasted 5 minutes' });

                    await response.edit({
                        embeds: [expiredEmbed],
                        components: []
                    }).catch(() => {}); // Ignore errors if message was deleted
                } catch (error) {
                    // Silently handle cleanup errors
                }
            });

        } catch (error) {
            console.error('Potion command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Potion Crafting Error')
                .setDescription('Something went wrong while setting up the potion crafting system. Please try again later.')
                .addFields({
                    name: 'Error Details',
                    value: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                    inline: false
                })
                .setFooter({ text: 'If this persists, contact support' });

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            }
        }
    }
};