const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('brew')
        .setDescription('🧪 Brew magical potions using gathered ingredients'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        
        try {
            // Get user profile with comprehensive error handling
            let userProfile = await db.getPlayer(userId);
            if (!userProfile) {
                userProfile = {
                    inventory: { coins: 100 },
                    stats: { level: 1, experience: 0 },
                    items: {},
                    skills: { alchemy: 1 }
                };
                await db.updatePlayer(userId, userProfile);
            }

            // Enhanced potion recipes with more detailed requirements
            const potionRecipes = [
                { 
                    id: 'health_potion',
                    name: 'Health Potion', 
                    cost: 50, 
                    ingredients: [
                        { name: 'Healing Herb', key: 'healing_herb', required: 2 },
                        { name: 'Pure Water', key: 'pure_water', required: 1 }
                    ], 
                    effect: '+50 HP',
                    emoji: '❤️',
                    description: 'Restores health instantly',
                    successRate: 85,
                    expReward: 10
                },
                { 
                    id: 'mana_potion',
                    name: 'Mana Potion', 
                    cost: 75, 
                    ingredients: [
                        { name: 'Mana Crystal', key: 'mana_crystal', required: 1 },
                        { name: 'Moonwater', key: 'moonwater', required: 2 }
                    ], 
                    effect: '+30 MP',
                    emoji: '💙',
                    description: 'Restores magical energy',
                    successRate: 80,
                    expReward: 15
                },
                { 
                    id: 'strength_potion',
                    name: 'Strength Potion', 
                    cost: 100, 
                    ingredients: [
                        { name: 'Dragon Scale', key: 'dragon_scale', required: 1 },
                        { name: 'Fire Essence', key: 'fire_essence', required: 3 }
                    ], 
                    effect: '+10 STR (30min)',
                    emoji: '💪',
                    description: 'Temporarily boosts physical power',
                    successRate: 70,
                    expReward: 25
                },
                { 
                    id: 'speed_potion',
                    name: 'Speed Potion', 
                    cost: 80, 
                    ingredients: [
                        { name: 'Wind Feather', key: 'wind_feather', required: 2 },
                        { name: 'Quicksilver', key: 'quicksilver', required: 1 }
                    ], 
                    effect: '+5 SPD (20min)',
                    emoji: '💨',
                    description: 'Increases movement and reaction speed',
                    successRate: 75,
                    expReward: 20
                }
            ];

            // Helper function to check if user has required ingredients
            function hasRequiredIngredients(recipe, userItems) {
                return recipe.ingredients.every(ingredient => {
                    const userAmount = userItems[ingredient.key] || 0;
                    return userAmount >= ingredient.required;
                });
            }

            // Helper function to get ingredient status display
            function getIngredientStatus(recipe, userItems) {
                return recipe.ingredients.map(ingredient => {
                    const userAmount = userItems[ingredient.key] || 0;
                    const hasEnough = userAmount >= ingredient.required;
                    const status = hasEnough ? '✅' : '❌';
                    return `${status} ${ingredient.name}: ${userAmount}/${ingredient.required}`;
                }).join('\n');
            }

            // Create main embed
            const createMainEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor('#9932CC')
                    .setTitle('🧪 Master Alchemist\'s Laboratory')
                    .setDescription(`**Welcome to the mystical brewing chamber!**\n\n*Combine ingredients to create powerful potions that will aid your adventures.*`)
                    .addFields(
                        { 
                            name: '📊 Your Alchemy Stats', 
                            value: `**Level:** ${userProfile.skills?.alchemy || 1}\n**Experience:** ${userProfile.skillExperience?.alchemy || 0} XP`, 
                            inline: true 
                        },
                        { 
                            name: '💰 Resources', 
                            value: `**Coins:** ${userProfile.coins || 0}\n**Potions Crafted:** ${userProfile.potionsCrafted || 0}`, 
                            inline: true 
                        },
                        { name: '\u200B', value: '\u200B', inline: true }
                    )
                    .setFooter({ text: 'Select a potion to view details and requirements' })
                    .setTimestamp();

                // Add potion overview
                const potionsList = potionRecipes.map(recipe => {
                    const canBrew = hasRequiredIngredients(recipe, userProfile.items || {}) && 
                                   (userProfile.coins || 0) >= recipe.cost;
                    const status = canBrew ? '✅ Ready to brew' : '❌ Missing requirements';
                    return `${recipe.emoji} **${recipe.name}** - ${status}`;
                }).join('\n');

                embed.addFields({ name: '🍯 Available Recipes', value: potionsList });

                return embed;
            };

            // Create detail embed for specific potion
            const createDetailEmbed = (recipe) => {
                const userItems = userProfile.items || {};
                const canBrew = hasRequiredIngredients(recipe, userItems) && 
                               (userProfile.coins || 0) >= recipe.cost;
                
                const embed = new EmbedBuilder()
                    .setColor(canBrew ? '#00FF00' : '#FF6B6B')
                    .setTitle(`${recipe.emoji} ${recipe.name}`)
                    .setDescription(`*${recipe.description}*`)
                    .addFields(
                        { 
                            name: '💫 Effects', 
                            value: recipe.effect, 
                            inline: true 
                        },
                        { 
                            name: '💰 Cost', 
                            value: `${recipe.cost} coins`, 
                            inline: true 
                        },
                        { 
                            name: '🎯 Success Rate', 
                            value: `${recipe.successRate}%`, 
                            inline: true 
                        },
                        {
                            name: '🧪 Required Ingredients',
                            value: getIngredientStatus(recipe, userItems),
                            inline: false
                        },
                        {
                            name: '⚡ Rewards',
                            value: `**XP Gained:** ${recipe.expReward}\n**Brewing Level Required:** ${Math.floor(recipe.cost / 50)}`,
                            inline: true
                        }
                    );

                if (!canBrew) {
                    const missingItems = recipe.ingredients.filter(ingredient => 
                        (userItems[ingredient.key] || 0) < ingredient.required
                    );
                    const insufficientFunds = (userProfile.coins || 0) < recipe.cost;
                    
                    let missingText = '';
                    if (missingItems.length > 0) {
                        missingText += `**Missing Ingredients:**\n${missingItems.map(item => 
                            `• ${item.name}: Need ${item.required - (userItems[item.key] || 0)} more`
                        ).join('\n')}`;
                    }
                    if (insufficientFunds) {
                        missingText += `${missingText ? '\n\n' : ''}**Insufficient Funds:**\nNeed ${recipe.cost - (userProfile.coins || 0)} more coins`;
                    }
                    
                    embed.addFields({ name: '⚠️ Requirements Not Met', value: missingText });
                }

                return embed;
            };

            // Create action buttons
            const createActionButtons = (selectedRecipe = null) => {
                const components = [];
                
                if (!selectedRecipe) {
                    // Main menu buttons - show recipe selection
                    const recipeButtons = potionRecipes.map(recipe => 
                        new ButtonBuilder()
                            .setCustomId(`view_recipe_${recipe.id}`)
                            .setLabel(recipe.name)
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(recipe.emoji)
                    );
                    
                    // Split into rows of 2
                    for (let i = 0; i < recipeButtons.length; i += 2) {
                        const row = new ActionRowBuilder().addComponents(
                            recipeButtons.slice(i, i + 2)
                        );
                        components.push(row);
                    }
                } else {
                    // Detail view buttons
                    const userItems = userProfile.items || {};
                    const canBrew = hasRequiredIngredients(selectedRecipe, userItems) && 
                                   (userProfile.coins || 0) >= selectedRecipe.cost;
                    
                    const brewButton = new ButtonBuilder()
                        .setCustomId(`brew_${selectedRecipe.id}`)
                        .setLabel(`Brew ${selectedRecipe.name}`)
                        .setStyle(canBrew ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setEmoji('🧪')
                        .setDisabled(!canBrew);
                    
                    const backButton = new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('Back to Recipes')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️');
                    
                    const infoButton = new ButtonBuilder()
                        .setCustomId('brewing_tips')
                        .setLabel('Brewing Tips')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💡');
                    
                    components.push(
                        new ActionRowBuilder().addComponents(brewButton, backButton, infoButton)
                    );
                }
                
                return components;
            };

            // Send initial response
            const mainEmbed = createMainEmbed();
            const mainComponents = createActionButtons();
            
            const response = await interaction.reply({ 
                embeds: [mainEmbed], 
                components: mainComponents,
                ephemeral: false
            });

            // Create collector for button interactions
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (buttonInteraction) => {
                // Check if the user who clicked is the same as the command user
                if (buttonInteraction.user.id !== userId) {
                    return buttonInteraction.reply({ 
                        content: '❌ You cannot interact with someone else\'s brewing session!', 
                        ephemeral: true 
                    });
                }

                try {
                    await buttonInteraction.deferUpdate();
                    
                    // Get fresh user data for each interaction
                    userProfile = await db.getPlayer(userId) || userProfile;

                    if (buttonInteraction.customId === 'back_to_main') {
                        // Return to main menu
                        const embed = createMainEmbed();
                        const components = createActionButtons();
                        await buttonInteraction.editReply({ embeds: [embed], components });
                        
                    } else if (buttonInteraction.customId === 'brewing_tips') {
                        // Show brewing tips
                        const tipsEmbed = new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('💡 Master Alchemist\'s Tips')
                            .setDescription('*Wisdom from years of brewing experience*')
                            .addFields(
                                {
                                    name: '🎯 Success Rates',
                                    value: 'Higher alchemy level increases success rates!\nRare ingredients have lower success rates but better rewards.',
                                    inline: false
                                },
                                {
                                    name: '📈 Leveling Up',
                                    value: 'Gain experience by successfully brewing potions.\nFailed attempts still give 25% experience.',
                                    inline: false
                                },
                                {
                                    name: '🛍️ Ingredient Sources',
                                    value: '• Gather from exploration commands\n• Purchase from traveling merchants\n• Receive as quest rewards\n• Trade with other players',
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Happy brewing! 🧪' });

                        const backButton = new ButtonBuilder()
                            .setCustomId('back_to_main')
                            .setLabel('Back to Laboratory')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️');

                        await buttonInteraction.editReply({ 
                            embeds: [tipsEmbed], 
                            components: [new ActionRowBuilder().addComponents(backButton)]
                        });
                        
                    } else if (buttonInteraction.customId.startsWith('view_recipe_')) {
                        // Show recipe details
                        const recipeId = buttonInteraction.customId.replace('view_recipe_', '');
                        const recipe = potionRecipes.find(r => r.id === recipeId);
                        
                        if (recipe) {
                            const embed = createDetailEmbed(recipe);
                            const components = createActionButtons(recipe);
                            await buttonInteraction.editReply({ embeds: [embed], components });
                        }
                        
                    } else if (buttonInteraction.customId.startsWith('brew_')) {
                        // Attempt to brew potion
                        const recipeId = buttonInteraction.customId.replace('brew_', '');
                        const recipe = potionRecipes.find(r => r.id === recipeId);
                        
                        if (!recipe) {
                            throw new Error('Recipe not found');
                        }

                        const userItems = userProfile.items || {};
                        const canBrew = hasRequiredIngredients(recipe, userItems) && 
                                       (userProfile.coins || 0) >= recipe.cost;

                        if (!canBrew) {
                            const errorEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Brewing Failed')
                                .setDescription('You don\'t have the required ingredients or coins!')
                                .setFooter({ text: 'Check the recipe requirements again.' });
                            
                            const backButton = new ButtonBuilder()
                                .setCustomId('back_to_main')
                                .setLabel('Back to Laboratory')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️');

                            await buttonInteraction.editReply({ 
                                embeds: [errorEmbed], 
                                components: [new ActionRowBuilder().addComponents(backButton)]
                            });
                            return;
                        }

                        // Process brewing attempt
                        const alchemyLevel = userProfile.skills?.alchemy || 1;
                        const levelBonus = Math.floor(alchemyLevel / 2);
                        const actualSuccessRate = Math.min(recipe.successRate + levelBonus, 95);
                        const isSuccess = Math.random() * 100 < actualSuccessRate;

                        // Deduct ingredients and coins
                        const updatedItems = { ...userItems };
                        recipe.ingredients.forEach(ingredient => {
                            updatedItems[ingredient.key] = (updatedItems[ingredient.key] || 0) - ingredient.required;
                        });

                        const expGained = isSuccess ? recipe.expReward : Math.floor(recipe.expReward * 0.25);
                        const newExp = (userProfile.skillExperience?.alchemy || 0) + expGained;
                        const newLevel = Math.floor(newExp / 100) + 1;

                        // Update user profile
                        const updateData = {
                            coins: (userProfile.coins || 0) - recipe.cost,
                            items: updatedItems,
                            skillExperience: {
                                ...userProfile.skillExperience,
                                alchemy: newExp
                            },
                            skills: {
                                ...userProfile.skills,
                                alchemy: Math.max(newLevel, userProfile.skills?.alchemy || 1)
                            },
                            potionsCrafted: (userProfile.potionsCrafted || 0) + (isSuccess ? 1 : 0)
                        };

                        // Add potion to inventory if successful
                        if (isSuccess) {
                            const potionKey = `potion_${recipe.id}`;
                            updateData.items[potionKey] = (updateData.items[potionKey] || 0) + 1;
                        }

                        await db.updatePlayer(userId, updateData);

                        // Create result embed
                        const resultEmbed = new EmbedBuilder()
                            .setColor(isSuccess ? '#00FF00' : '#FF6B6B')
                            .setTitle(isSuccess ? '✅ Brewing Successful!' : '❌ Brewing Failed!')
                            .setDescription(isSuccess ? 
                                `🎉 You successfully brewed a **${recipe.name}**!\n\n*The potion bubbles with magical energy.*` :
                                `💥 The mixture exploded! Your ingredients were lost, but you gained some experience.\n\n*Better luck next time, alchemist.*`
                            )
                            .addFields(
                                {
                                    name: '📈 Experience Gained',
                                    value: `+${expGained} XP ${newLevel > (userProfile.skills?.alchemy || 1) ? '\n🎊 **Level Up!**' : ''}`,
                                    inline: true
                                },
                                {
                                    name: '💰 Coins Spent',
                                    value: `${recipe.cost} coins`,
                                    inline: true
                                }
                            );

                        if (isSuccess) {
                            resultEmbed.addFields({
                                name: '🎁 Reward',
                                value: `**${recipe.name}** added to inventory\n*${recipe.effect}*`,
                                inline: false
                            });
                        }

                        const continueButton = new ButtonBuilder()
                            .setCustomId('back_to_main')
                            .setLabel('Continue Brewing')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🧪');

                        await buttonInteraction.editReply({ 
                            embeds: [resultEmbed], 
                            components: [new ActionRowBuilder().addComponents(continueButton)]
                        });
                    }

                } catch (error) {
                    console.error('Brewing interaction error:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ Something Went Wrong')
                        .setDescription('An error occurred during brewing. Please try again.');

                    const backButton = new ButtonBuilder()
                        .setCustomId('back_to_main')
                        .setLabel('Back to Laboratory')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️');

                    await buttonInteraction.editReply({ 
                        embeds: [errorEmbed], 
                        components: [new ActionRowBuilder().addComponents(backButton)]
                    }).catch(() => {}); // Ignore edit errors
                }
            });

            collector.on('end', async () => {
                try {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('🧪 Brewing Session Expired')
                        .setDescription('This brewing session has timed out. Use `/brew` again to start a new session.')
                        .setFooter({ text: 'Session lasted 5 minutes' });

                    await response.edit({ 
                        embeds: [expiredEmbed], 
                        components: [] 
                    }).catch(() => {}); // Ignore edit errors if message was deleted
                } catch (error) {
                    // Silently handle cleanup errors
                }
            });

        } catch (error) {
            console.error('Brew command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Alchemy Laboratory Error')
                .setDescription('Something went wrong while setting up the brewing laboratory. Please try again later.')
                .addFields({ 
                    name: 'Error Details', 
                    value: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                    inline: false 
                });

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            }
        }
    }
};