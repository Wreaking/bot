
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profession')
        .setDescription('🛠️ Manage your crafting professions and career paths')
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train a profession skill')
                .addStringOption(option =>
                    option.setName('profession')
                        .setDescription('Choose profession to train')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚒️ Mining - Extract precious ores and gems', value: 'mining' },
                            { name: '🌿 Herbalism - Gather magical plants and herbs', value: 'herbalism' },
                            { name: '⚔️ Blacksmithing - Forge weapons and armor', value: 'blacksmithing' },
                            { name: '🧪 Alchemy - Brew potions and elixirs', value: 'alchemy' },
                            { name: '✨ Enchanting - Imbue items with magic', value: 'enchanting' },
                            { name: '🎣 Fishing - Master the art of angling', value: 'fishing' },
                            { name: '🍖 Cooking - Prepare nourishing meals', value: 'cooking' },
                            { name: '📜 Scribing - Create scrolls and tomes', value: 'scribing' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your profession levels and specializations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recipes')
                .setDescription('Browse available recipes and formulas')
                .addStringOption(option =>
                    option.setName('profession')
                        .setDescription('Choose profession')
                        .setRequired(false)
                        .addChoices(
                            { name: '⚒️ Mining', value: 'mining' },
                            { name: '🌿 Herbalism', value: 'herbalism' },
                            { name: '⚔️ Blacksmithing', value: 'blacksmithing' },
                            { name: '🧪 Alchemy', value: 'alchemy' },
                            { name: '✨ Enchanting', value: 'enchanting' },
                            { name: '🎣 Fishing', value: 'fishing' },
                            { name: '🍖 Cooking', value: 'cooking' },
                            { name: '📜 Scribing', value: 'scribing' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('specialize')
                .setDescription('Choose a specialization to unlock advanced abilities'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('workshop')
                .setDescription('Access your crafting workshop and equipment')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Initialize professions if not exist
            if (!player.professions) {
                player.professions = this.getDefaultProfessions();
            }

            switch (subcommand) {
                case 'train':
                    await this.handleTraining(interaction, player);
                    break;
                case 'status':
                    await this.showStatus(interaction, player);
                    break;
                case 'recipes':
                    await this.showRecipes(interaction, player);
                    break;
                case 'specialize':
                    await this.showSpecializations(interaction, player);
                    break;
                case 'workshop':
                    await this.showWorkshop(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in profession command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing professions. Please try again.',
                ephemeral: true
            });
        }
    },

    async handleTraining(interaction, player) {
        const profession = interaction.options.getString('profession');
        const professionData = player.professions[profession] || this.getDefaultProfession();
        
        const currentTime = Date.now();
        const trainingCooldown = 240000; // 4 minutes

        if (currentTime - (player.professions.lastTraining || 0) < trainingCooldown) {
            const remainingTime = Math.ceil((trainingCooldown - (currentTime - (player.professions.lastTraining || 0))) / 60000);
            await interaction.editReply({
                content: `⏳ Your profession workshop needs ${remainingTime} more minutes to prepare for the next training session.\n💡 *Use this time to gather materials or explore!*`
            });
            return;
        }

        const requirements = this.getTrainingRequirements(profession, professionData.level);
        
        // Check requirements
        const missingRequirements = [];
        if ((player.coins || 0) < requirements.goldCost) {
            missingRequirements.push(`${requirements.goldCost} coins`);
        }
        if ((player.stamina || 100) < requirements.staminaCost) {
            missingRequirements.push(`${requirements.staminaCost} stamina`);
        }
        
        // Check materials
        requirements.materials.forEach(material => {
            const owned = this.getInventoryCount(player, material.id);
            if (owned < material.amount) {
                missingRequirements.push(`${material.amount} ${material.name} (have ${owned})`);
            }
        });

        if (missingRequirements.length > 0) {
            await interaction.editReply({
                content: `❌ **Missing requirements for ${profession} training:**\n${missingRequirements.map(req => `• ${req}`).join('\n')}\n\n💡 *Gather materials through exploration, purchase from shop, or complete quests!*`
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle(`🛠️ ${this.getProfessionEmoji(profession)} ${this.capitalize(profession)} Training`)
            .setDescription(`**Master the craft and unlock new possibilities**\n\nCurrent Level: **${professionData.level}** (${professionData.exp}/${professionData.nextLevel} XP)`)
            .addFields([
                {
                    name: '💰 Training Costs',
                    value: `**Gold:** ${requirements.goldCost}\n**Stamina:** ${requirements.staminaCost}\n**Materials:** ${requirements.materials.map(m => `${m.amount} ${m.name}`).join(', ')}`,
                    inline: true
                },
                {
                    name: '📈 Potential Rewards',
                    value: `**Base XP:** ${requirements.baseExp}\n**Possible Bonus:** +${Math.floor(requirements.baseExp * 0.5)}\n**Success Rate:** ${requirements.successRate}%`,
                    inline: true
                },
                {
                    name: '🏆 Next Milestone',
                    value: `**Level ${professionData.level + 1}:** ${this.getNextRecipe(profession, professionData.level + 1)}\n**Progress:** ${Math.floor((professionData.exp / professionData.nextLevel) * 100)}%`,
                    inline: false
                }
            ])
            .setFooter({ text: '💡 Higher level training may yield rare materials and bonus rewards!' });

        const trainingOptions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('profession_train_basic')
                    .setLabel('🔨 Basic Training')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('profession_train_advanced')
                    .setLabel('⚡ Advanced Training')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔥')
                    .setDisabled(professionData.level < 10),
                new ButtonBuilder()
                    .setCustomId('profession_train_master')
                    .setLabel('👑 Master Training')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨')
                    .setDisabled(professionData.level < 25)
            );

        const controls = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('profession_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('profession_workshop')
                    .setLabel('🏭 Workshop')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.editReply({
            embeds: [embed],
            components: [trainingOptions, controls]
        });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('profession_');
        
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 45000 });

            if (confirmation.customId === 'profession_cancel') {
                await confirmation.update({
                    content: '❌ Training session cancelled.',
                    embeds: [],
                    components: []
                });
                return;
            }

            if (confirmation.customId === 'profession_workshop') {
                await this.showWorkshop(confirmation, player);
                return;
            }

            const trainingType = confirmation.customId.split('_')[2];
            const result = await this.processTraining(player, profession, trainingType, requirements);

            await confirmation.update({
                embeds: [result.embed],
                components: result.components || []
            });

            await db.updatePlayer(userId, player);

        } catch (e) {
            await interaction.editReply({
                content: '❌ Training session timed out. Please try again.',
                embeds: [],
                components: []
            });
        }
    },

    async processTraining(player, profession, trainingType, requirements) {
        const professionData = player.professions[profession];
        
        // Deduct costs
        player.coins -= requirements.goldCost;
        player.stamina -= requirements.staminaCost;
        player.professions.lastTraining = Date.now();

        // Remove materials
        requirements.materials.forEach(material => {
            this.removeFromInventory(player, material.id, material.amount);
        });

        // Calculate training results
        const multipliers = { basic: 1.0, advanced: 1.5, master: 2.0 };
        const multiplier = multipliers[trainingType] || 1.0;
        
        const successRate = Math.random();
        let expGained, trainingResult, bonusRewards = [];

        if (successRate > 0.95) {
            // Critical success
            expGained = Math.floor(requirements.baseExp * multiplier * 2);
            trainingResult = '🌟 **CRITICAL SUCCESS!** Perfect technique achieved!';
            
            // Bonus rewards
            bonusRewards.push(`💰 ${Math.floor(requirements.goldCost * 0.5)} bonus coins`);
            if (Math.random() > 0.7) {
                bonusRewards.push('🎁 Rare material discovered');
                this.addToInventory(player, this.getRandomRareMaterial(profession), 1);
            }
        } else if (successRate > 0.7) {
            // Great success
            expGained = Math.floor(requirements.baseExp * multiplier * 1.5);
            trainingResult = '✨ **Great success!** Excellent craftsmanship displayed!';
            
            if (Math.random() > 0.8) {
                bonusRewards.push(`💰 ${Math.floor(requirements.goldCost * 0.25)} bonus coins`);
            }
        } else if (successRate > 0.3) {
            // Normal success
            expGained = Math.floor(requirements.baseExp * multiplier);
            trainingResult = '✅ Training completed successfully.';
        } else {
            // Partial success
            expGained = Math.floor(requirements.baseExp * multiplier * 0.5);
            trainingResult = '⚠️ Training had complications, but you learned from the experience.';
        }

        professionData.exp += expGained;

        // Level up check
        let levelUpRewards = [];
        while (professionData.exp >= professionData.nextLevel) {
            professionData.exp -= professionData.nextLevel;
            professionData.level += 1;
            professionData.nextLevel = Math.floor(100 * Math.pow(1.4, professionData.level - 1));
            
            const newRecipe = this.getNextRecipe(profession, professionData.level);
            levelUpRewards.push(`🌟 **Level ${professionData.level} reached!** Unlocked: ${newRecipe}`);
            
            // Level rewards
            const levelBonus = professionData.level * 25;
            player.coins += levelBonus;
            levelUpRewards.push(`💰 Level bonus: ${levelBonus} coins`);
            
            // Special rewards at milestone levels
            if (professionData.level % 10 === 0) {
                levelUpRewards.push('🎁 Milestone reward: Workshop upgrade unlocked!');
            }
        }

        const embed = new EmbedBuilder()
            .setColor(expGained >= requirements.baseExp ? '#00FF00' : '#FFA500')
            .setTitle(`🛠️ ${this.getProfessionEmoji(profession)} Training Results`)
            .setDescription([
                trainingResult,
                bonusRewards.length > 0 ? `\n**Bonus Rewards:**\n${bonusRewards.map(r => `• ${r}`).join('\n')}` : '',
                levelUpRewards.length > 0 ? `\n${levelUpRewards.join('\n')}` : ''
            ].filter(Boolean).join(''))
            .addFields([
                { name: 'Profession', value: this.capitalize(profession), inline: true },
                { name: 'Level', value: professionData.level.toString(), inline: true },
                { name: 'XP Gained', value: expGained.toString(), inline: true },
                { 
                    name: 'Progress', 
                    value: `${professionData.exp}/${professionData.nextLevel}\n${this.createProgressBar(professionData.exp, professionData.nextLevel)}`, 
                    inline: false 
                }
            ])
            .setFooter({ text: `Training efficiency: ${Math.floor((expGained / requirements.baseExp) * 100)}%` });

        const components = levelUpRewards.length > 0 ? [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('view_recipes')
                    .setLabel('📜 View New Recipes')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('continue_training')
                    .setLabel('🔄 Continue Training')
                    .setStyle(ButtonStyle.Primary)
            )
        ] : undefined;

        return { embed, components };
    },

    async showStatus(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🛠️ Profession Status')
            .setDescription('**Your crafting expertise and specializations**\nTrack your progress across all professions.')
            .setThumbnail(interaction.user.displayAvatarURL());

        let totalLevel = 0;
        let totalExp = 0;
        let activeSpecializations = 0;

        Object.entries(player.professions).forEach(([profession, data]) => {
            if (profession !== 'lastTraining' && profession !== 'specializations') {
                const progressBar = this.createProgressBar(data.exp, data.nextLevel);
                const proficiencyLevel = this.getProficiencyLevel(data.level);
                const nextRecipe = this.getNextRecipe(profession, data.level + 1);
                
                embed.addFields({
                    name: `${this.getProfessionEmoji(profession)} ${this.capitalize(profession)} ${proficiencyLevel}`,
                    value: `**Level ${data.level}** (${data.exp}/${data.nextLevel} exp)\n${progressBar}\n🎯 Next: ${nextRecipe}`,
                    inline: true
                });
                
                totalLevel += data.level;
                totalExp += data.exp + (data.level - 1) * 100;
            }
        });

        if (player.professions.specializations) {
            activeSpecializations = Object.keys(player.professions.specializations).length;
        }

        const craftingRank = this.getCraftingRank(totalLevel);
        const workshopLevel = this.getWorkshopLevel(totalLevel);

        embed.addFields([
            {
                name: '📈 Overall Crafting Progress',
                value: `**Total Levels:** ${totalLevel}\n**Total Experience:** ${totalExp.toLocaleString()}\n**Crafting Rank:** ${craftingRank}\n**Specializations:** ${activeSpecializations}/3`,
                inline: false
            },
            {
                name: '🏭 Workshop Status',
                value: `**Workshop Level:** ${workshopLevel}\n**Available Stations:** ${this.getWorkshopStations(workshopLevel)}\n**Efficiency Bonus:** +${workshopLevel * 5}%`,
                inline: true
            },
            {
                name: '🏆 Crafting Achievements',
                value: this.getCraftingAchievements(totalLevel, player.professions),
                inline: true
            }
        ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('profession_recipes_all')
                    .setLabel('📜 All Recipes')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('profession_specialize')
                    .setLabel('⭐ Specializations')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('profession_workshop')
                    .setLabel('🏭 Workshop')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showRecipes(interaction, player) {
        const profession = interaction.options?.getString('profession');
        
        if (profession) {
            await this.showProfessionRecipes(interaction, player, profession);
        } else {
            await this.showAllRecipes(interaction, player);
        }
    },

    async showProfessionRecipes(interaction, player, profession) {
        const professionData = player.professions[profession] || this.getDefaultProfession();
        const recipes = this.getRecipes(profession);
        
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle(`📜 ${this.getProfessionEmoji(profession)} ${this.capitalize(profession)} Recipes`)
            .setDescription(`**Available recipes for your current level (${professionData.level})**\nCraft items to gain experience and valuable resources.`);

        const availableRecipes = recipes.filter(recipe => recipe.level <= professionData.level);
        const lockedRecipes = recipes.filter(recipe => recipe.level > professionData.level && recipe.level <= professionData.level + 10);

        if (availableRecipes.length > 0) {
            embed.addFields({
                name: '✅ Available Recipes',
                value: availableRecipes.map(recipe => 
                    `**${recipe.name}** (Lv.${recipe.level})\n${recipe.description}\n*Materials:* ${recipe.materials.map(m => `${m.amount} ${m.name}`).join(', ')}\n`
                ).join('\n'),
                inline: false
            });
        }

        if (lockedRecipes.length > 0) {
            embed.addFields({
                name: '🔒 Upcoming Recipes',
                value: lockedRecipes.slice(0, 5).map(recipe => 
                    `**${recipe.name}** (Lv.${recipe.level}) - ${recipe.description}`
                ).join('\n'),
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`craft_${profession}`)
                    .setLabel('🔨 Craft Items')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(availableRecipes.length === 0),
                new ButtonBuilder()
                    .setCustomId('recipe_book')
                    .setLabel('📚 Recipe Book')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('back_to_status')
                    .setLabel('← Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    getDefaultProfessions() {
        return {
            mining: { level: 1, exp: 0, nextLevel: 100 },
            herbalism: { level: 1, exp: 0, nextLevel: 100 },
            blacksmithing: { level: 1, exp: 0, nextLevel: 100 },
            alchemy: { level: 1, exp: 0, nextLevel: 100 },
            enchanting: { level: 1, exp: 0, nextLevel: 100 },
            fishing: { level: 1, exp: 0, nextLevel: 100 },
            cooking: { level: 1, exp: 0, nextLevel: 100 },
            scribing: { level: 1, exp: 0, nextLevel: 100 },
            lastTraining: 0,
            specializations: {}
        };
    },

    getDefaultProfession() {
        return { level: 1, exp: 0, nextLevel: 100 };
    },

    getTrainingRequirements(profession, level) {
        const baseGold = 75;
        const baseStamina = 30;
        const baseExp = 35;

        return {
            goldCost: Math.floor(baseGold * Math.pow(1.2, level - 1)),
            staminaCost: baseStamina + Math.floor(level / 3) * 5,
            baseExp: Math.floor(baseExp * Math.pow(1.1, level)),
            successRate: Math.max(60, 95 - level),
            materials: this.getTrainingMaterials(profession, level)
        };
    },

    getTrainingMaterials(profession, level) {
        const materialLists = {
            mining: [
                { id: 'pickaxe', name: 'Pickaxe', amount: 1 },
                { id: 'torch', name: 'Torch', amount: Math.ceil(level / 5) }
            ],
            herbalism: [
                { id: 'gathering_basket', name: 'Gathering Basket', amount: 1 },
                { id: 'herb_knife', name: 'Herb Knife', amount: 1 }
            ],
            blacksmithing: [
                { id: 'iron_ore', name: 'Iron Ore', amount: Math.ceil(level / 3) },
                { id: 'coal', name: 'Coal', amount: Math.ceil(level / 2) }
            ],
            alchemy: [
                { id: 'empty_vial', name: 'Empty Vial', amount: Math.ceil(level / 2) },
                { id: 'water', name: 'Pure Water', amount: 1 }
            ],
            enchanting: [
                { id: 'mana_crystal', name: 'Mana Crystal', amount: 1 },
                { id: 'enchanting_dust', name: 'Enchanting Dust', amount: Math.ceil(level / 4) }
            ],
            fishing: [
                { id: 'fishing_rod', name: 'Fishing Rod', amount: 1 },
                { id: 'bait', name: 'Bait', amount: Math.ceil(level / 2) }
            ],
            cooking: [
                { id: 'ingredients', name: 'Fresh Ingredients', amount: Math.ceil(level / 3) },
                { id: 'seasoning', name: 'Seasoning', amount: 1 }
            ],
            scribing: [
                { id: 'parchment', name: 'Parchment', amount: Math.ceil(level / 2) },
                { id: 'ink', name: 'Quality Ink', amount: 1 }
            ]
        };

        return materialLists[profession] || [];
    },

    getProfessionEmoji(profession) {
        const emojis = {
            mining: '⚒️',
            herbalism: '🌿',
            blacksmithing: '⚔️',
            alchemy: '🧪',
            enchanting: '✨',
            fishing: '🎣',
            cooking: '🍖',
            scribing: '📜'
        };
        return emojis[profession] || '🛠️';
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    createProgressBar(current, max, length = 20) {
        const progress = Math.floor((current / max) * length);
        const bar = '█'.repeat(progress) + '░'.repeat(length - progress);
        const percentage = Math.floor((current / max) * 100);
        return `${bar} ${percentage}%`;
    },

    getNextRecipe(profession, level) {
        const recipes = this.getRecipes(profession);
        const nextRecipe = recipes.find(recipe => recipe.level === level);
        return nextRecipe ? nextRecipe.name : 'Max level reached!';
    },

    getRecipes(profession) {
        const recipeData = {
            mining: [
                { level: 1, name: 'Copper Ore', description: 'Basic mining material' },
                { level: 5, name: 'Iron Ore', description: 'Sturdy crafting component' },
                { level: 10, name: 'Silver Ore', description: 'Valuable precious metal' },
                { level: 15, name: 'Gold Ore', description: 'Highly valuable ore' },
                { level: 20, name: 'Mithril Ore', description: 'Magical lightweight metal' },
                { level: 30, name: 'Adamantite Ore', description: 'Extremely durable material' }
            ],
            blacksmithing: [
                { level: 1, name: 'Iron Dagger', description: 'Basic weapon', materials: [{ name: 'Iron Ore', amount: 2 }] },
                { level: 5, name: 'Steel Sword', description: 'Reliable blade', materials: [{ name: 'Iron Ore', amount: 3 }, { name: 'Coal', amount: 2 }] },
                { level: 10, name: 'Enchanted Armor', description: 'Magic-infused protection', materials: [{ name: 'Steel Ingot', amount: 5 }] }
            ]
            // More recipes for other professions...
        };

        return recipeData[profession] || [];
    },

    getProficiencyLevel(level) {
        if (level >= 50) return '👑 Grandmaster';
        if (level >= 40) return '🌟 Master';
        if (level >= 30) return '🏆 Expert';
        if (level >= 20) return '⭐ Artisan';
        if (level >= 10) return '🎯 Skilled';
        if (level >= 5) return '📈 Apprentice';
        return '🌱 Novice';
    },

    getCraftingRank(totalLevel) {
        if (totalLevel >= 400) return '👑 Legendary Artisan';
        if (totalLevel >= 300) return '🌟 Master Craftsman';
        if (totalLevel >= 200) return '🏆 Expert Artisan';
        if (totalLevel >= 150) return '⭐ Skilled Craftsman';
        if (totalLevel >= 100) return '🎯 Competent Crafter';
        if (totalLevel >= 50) return '📈 Aspiring Artisan';
        return '🌱 Novice Crafter';
    },

    getWorkshopLevel(totalLevel) {
        return Math.floor(totalLevel / 50) + 1;
    },

    getWorkshopStations(level) {
        const stations = Math.min(level + 2, 8);
        return `${stations}/8`;
    },

    getCraftingAchievements(totalLevel, professions) {
        const achievements = [];
        if (totalLevel >= 100) achievements.push('🏆 Dedicated Crafter');
        if (totalLevel >= 200) achievements.push('🌟 Master of Trades');
        
        Object.values(professions).forEach(prof => {
            if (prof.level >= 25) achievements.push('⭐ Specialist');
        });

        return achievements.slice(0, 3).join('\n') || 'No achievements yet';
    },

    getInventoryCount(player, itemId) {
        if (!player.inventory?.items) return 0;
        const item = player.inventory.items.find(i => i.id === itemId);
        return item ? item.quantity || 1 : 0;
    },

    removeFromInventory(player, itemId, amount) {
        if (!player.inventory?.items) return;
        const itemIndex = player.inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
            const item = player.inventory.items[itemIndex];
            if (item.quantity > amount) {
                item.quantity -= amount;
            } else {
                player.inventory.items.splice(itemIndex, 1);
            }
        }
    },

    addToInventory(player, itemId, amount) {
        if (!player.inventory) player.inventory = { items: [] };
        if (!player.inventory.items) player.inventory.items = [];
        
        const existingItem = player.inventory.items.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + amount;
        } else {
            player.inventory.items.push({ id: itemId, quantity: amount });
        }
    },

    getRandomRareMaterial(profession) {
        const rareMaterials = {
            mining: 'rare_gem',
            herbalism: 'mystical_herb',
            blacksmithing: 'ancient_metal',
            alchemy: 'philosophers_stone_fragment',
            enchanting: 'pure_mana_crystal',
            fishing: 'golden_scale',
            cooking: 'exotic_spice',
            scribing: 'ancient_ink'
        };
        
        return rareMaterials[profession] || 'mysterious_material';
    }
};
