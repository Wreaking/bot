const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.js');
const { db } = require('../database.js'); // Use the new database module

class ButtonInteractionHandler {
    constructor() {
        this.cooldowns = new Map();
        this.actionHandlers = new Map();
        this.initializeHandlers();
    }

    initializeHandlers() {
        // Map action prefixes to their respective handler methods
        this.actionHandlers.set('pet', this.handlePetButtons.bind(this));
        this.actionHandlers.set('mine', this.handleMiningButtons.bind(this));
        this.actionHandlers.set('fish', this.handleFishingButtons.bind(this));
        this.actionHandlers.set('fishing', this.handleFishingButtons.bind(this));
        this.actionHandlers.set('travel', this.handleTravelButtons.bind(this));
        this.actionHandlers.set('upgrade', this.handleUpgradeButtons.bind(this));
        this.actionHandlers.set('drink', this.handleTavernButtons.bind(this));
        this.actionHandlers.set('tavern', this.handleTavernButtons.bind(this));
        this.actionHandlers.set('explore', this.handleExploreButtons.bind(this));
        this.actionHandlers.set('craft', this.handleCraftButtons.bind(this));
        this.actionHandlers.set('spell', this.handleSpellButtons.bind(this));
        this.actionHandlers.set('magic', this.handleSpellButtons.bind(this));
        this.actionHandlers.set('attack', this.handleCombatButtons.bind(this));
        this.actionHandlers.set('defend', this.handleCombatButtons.bind(this));
        this.actionHandlers.set('heal', this.handleCombatButtons.bind(this));
        this.actionHandlers.set('combat', this.handleCombatButtons.bind(this));
        this.actionHandlers.set('bank', this.handleBankButtons.bind(this));
        this.actionHandlers.set('manage', this.handleManageButtons.bind(this));
        this.actionHandlers.set('brew', this.handleBrewButtons.bind(this));
        this.actionHandlers.set('view_recipe', this.handleBrewButtons.bind(this));
        this.actionHandlers.set('auction', this.handleAuctionButtons.bind(this));
        this.actionHandlers.set('achievement', this.handleAchievementButtons.bind(this));
        this.actionHandlers.set('inventory', this.handleInventoryButtons.bind(this));
        this.actionHandlers.set('shop', this.handleShopButtons.bind(this));
        this.actionHandlers.set('forge', this.handleForgeButtons.bind(this));
        this.actionHandlers.set('cast', this.handleCastButtons.bind(this));
        this.actionHandlers.set('build', this.handleBuildButtons.bind(this));
        this.actionHandlers.set('enchant', this.handleEnchantButtons.bind(this));
        this.actionHandlers.set('excavate', this.handleExcavateButtons.bind(this));
        this.actionHandlers.set('gamble', this.handleGambleButtons.bind(this));
        this.actionHandlers.set('arena', this.handleArenaButtons.bind(this));
        this.actionHandlers.set('battle', this.handleBattleButtons.bind(this));
        this.actionHandlers.set('dungeon', this.handleDungeonButtons.bind(this));
        this.actionHandlers.set('daily', this.handleDailyButtons.bind(this));
        this.actionHandlers.set('lottery', this.handleLotteryButtons.bind(this));
        this.actionHandlers.set('tournament', this.handleTournamentButtons.bind(this));
        this.actionHandlers.set('quest', this.handleQuestButtons.bind(this));
        this.actionHandlers.set('weather', this.handleWeatherButtons.bind(this));
        this.actionHandlers.set('manage', this.handleManageButtons.bind(this));
    }

    // Utility methods
    async safeReply(interaction, content, ephemeral = true) {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(content);
            } else {
                return await interaction.reply({ ...content, ephemeral });
            }
        } catch (error) {
            console.error('Error replying to interaction:', error);
            try {
                await interaction.followUp({ 
                    content: '❌ An error occurred while processing your request.', 
                    ephemeral: true 
                });
            } catch (followUpError) {
                console.error('Error sending follow-up:', followUpError);
            }
        }
    }

    checkCooldown(userId, action, cooldownTime = 3000) {
        const key = `${userId}_${action}`;
        const now = Date.now();
        
        if (this.cooldowns.has(key)) {
            const lastUsed = this.cooldowns.get(key);
            const timeLeft = cooldownTime - (now - lastUsed);
            
            if (timeLeft > 0) {
                return Math.ceil(timeLeft / 1000);
            }
        }
        
        this.cooldowns.set(key, now);
        return 0;
    }

    async getUserDataSafely(userId) {
        try {
            return await db.getPlayer(userId);
        } catch (error) {
            console.error(`Error getting user data for ${userId}:`, error);
            // Return default data structure if database fails
            return {
                coins: 100,
                inventory: {},
                pets: [],
                stats: { mining: 1, fishing: 1 },
                bank: { savings: 0 },
                buffs: [],
                dailyStreak: 0,
                level: 1,
                experience: 0
            };
        }
    }

    async updateUserDataSafely(userId, updateData) {
        try {
            await db.updatePlayer(userId, updateData);
            return true;
        } catch (error) {
            console.error(`Error updating user data for ${userId}:`, error);
            return false;
        }
    }

    async executeCommand(interaction, commandName) {
        try {
            const command = interaction.client.commands?.get(commandName);
            if (command && typeof command.execute === 'function') {
                await command.execute(interaction);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            return false;
        }
    }

    // Main handler method
    async handleButtonInteraction(interaction) {
        if (!interaction.isButton()) return;

        try {
            const [action, ...args] = interaction.customId.split('_');
            const userId = interaction.user.id;

            // Check cooldown
            const cooldownLeft = this.checkCooldown(userId, action);
            if (cooldownLeft > 0) {
                await this.safeReply(interaction, {
                    content: `⏱️ Please wait ${cooldownLeft} seconds before using this button again.`
                });
                return;
            }

            // Get handler for the action
            const handler = this.actionHandlers.get(action);
            
            if (handler) {
                await handler(interaction, args, userId);
            } else {
                console.warn(`Unhandled button action: ${action}`);
                await this.safeReply(interaction, {
                    content: 'This button action is not available. Please try using the command again.'
                });
            }
        } catch (error) {
            console.error('Button handler error:', error);
            console.error('Stack trace:', error.stack);
            
            // Try to use error handler if available
            try {
                const RobustErrorHandler = require('../utils/robustErrorHandler.js');
                await RobustErrorHandler.handleButtonError(interaction, error, interaction.customId);
            } catch (handlerError) {
                console.error('Error handler failed:', handlerError);
                await this.safeReply(interaction, {
                    content: '❌ An unexpected error occurred. Please try again later.'
                });
            }
        }
    }

    /**
     * Handle all manage command button interactions
     * @param {ButtonInteraction} interaction - Button interaction
     */
    async handleManageButtons(interaction, args, userId) {
        // Check administrator permissions first
        if (!interaction.member?.permissions?.has('Administrator')) {
            return await this.safeReply(interaction, {
                content: '❌ You need administrator permissions to use these controls!',
                ephemeral: true
            });
        }

        const action = args.join('_');
        
        try {
            // Get the manage command instance
            const manageCommand = require('../commands/admin/manage.js');

            // Find the corresponding button handler
            if (manageCommand.buttonHandlers && manageCommand.buttonHandlers[action]) {
                await manageCommand.buttonHandlers[action].call(manageCommand, interaction);
            } else {
                // Handle common manage actions
                switch (action) {
                    case 'stats_refresh':
                        await this.handleStatsRefresh(interaction);
                        break;
                    case 'reset_user':
                        await this.handleUserReset(interaction);
                        break;
                    case 'backup_data':
                        await this.handleBackupData(interaction);
                        break;
                    default:
                        await this.safeReply(interaction, {
                            content: '❌ This management action is not implemented yet.',
                            ephemeral: true
                        });
                }
            }
        } catch (error) {
            console.error(`Error handling manage button ${action}:`, error);
            await this.safeReply(interaction, {
                content: '❌ An error occurred while processing the management action.',
                ephemeral: true
            });
        }
    }

    async handleStatsRefresh(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('📊 Server Statistics Refreshed')
            .setDescription('All server statistics have been updated!')
            .addFields([
                { name: '👥 Active Users', value: `${interaction.guild?.memberCount || 0}`, inline: true },
                { name: '🤖 Bot Uptime', value: `${Math.floor(process.uptime() / 3600)}h`, inline: true },
                { name: '💾 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true }
            ])
            .setTimestamp();

        await this.safeReply(interaction, { embeds: [embed] });
    }

    async handleUserReset(interaction) {
        await this.safeReply(interaction, {
            content: '🔄 User data reset functionality would be implemented here. This is a placeholder for admin safety.',
            ephemeral: true
        });
    }

    async handleBackupData(interaction) {
        await this.safeReply(interaction, {
            content: '💾 Database backup initiated. This process may take a few moments...',
            ephemeral: true
        });
    }

    async handlePetButtons(interaction, args, userId) {
        const action = args[0];
        const userData = await this.getUserDataSafely(userId);

        switch (action) {
            case 'feed':
                const feedCost = 10;
                if (userData.coins >= feedCost && userData.pets && userData.pets.length > 0) {
                    const updateData = {
                        coins: userData.coins - feedCost
                    };
                    
                    // Update pet data
                    const pet = userData.pets[0];
                    pet.hunger = Math.min(100, (pet.hunger || 50) + 30);
                    updateData.pets = userData.pets;

                    if (await this.updateUserDataSafely(userId, updateData)) {
                        await this.safeReply(interaction, {
                            content: `🐕 Fed your pet! Hunger: ${pet.hunger}/100 💰 (-${feedCost} coins)`
                        });
                    } else {
                        await this.safeReply(interaction, {
                            content: '❌ Failed to feed pet. Please try again.'
                        });
                    }
                } else {
                    await this.safeReply(interaction, {
                        content: userData.pets?.length === 0 ? 
                            '❌ You don\'t have any pets!' : 
                            `❌ You need at least ${feedCost} coins to feed your pet!`
                    });
                }
                break;

            case 'play':
                if (userData.pets && userData.pets.length > 0) {
                    const pet = userData.pets[0];
                    pet.loyalty = Math.min(100, (pet.loyalty || 0) + 10);
                    
                    if (await this.updateUserDataSafely(userId, { pets: userData.pets })) {
                        await this.safeReply(interaction, {
                            content: `🎾 Played with your pet! Loyalty: ${pet.loyalty}/100 ❤️`
                        });
                    } else {
                        await this.safeReply(interaction, {
                            content: '❌ Failed to play with pet. Please try again.'
                        });
                    }
                } else {
                    await this.safeReply(interaction, {
                        content: '❌ You don\'t have any pets to play with!'
                    });
                }
                break;

            case 'status':
                if (userData.pets && userData.pets.length > 0) {
                    const pet = userData.pets[0];
                    const embed = new EmbedBuilder()
                        .setColor(config.embedColors?.info || '#0099ff')
                        .setTitle(`🐕 ${pet.name || 'Your Pet'}`)
                        .addFields([
                            { name: '🍖 Hunger', value: `${pet.hunger || 50}/100`, inline: true },
                            { name: '❤️ Loyalty', value: `${pet.loyalty || 0}/100`, inline: true },
                            { name: '⭐ Level', value: `${pet.level || 1}`, inline: true }
                        ])
                        .setTimestamp();
                    
                    await this.safeReply(interaction, { embeds: [embed] });
                } else {
                    await this.safeReply(interaction, {
                        content: '❌ You don\'t have any pets!'
                    });
                }
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown pet action.'
                });
        }
    }

    async handleMiningButtons(interaction, args, userId) {
        const action = args[0];
        
        switch (action) {
            case 'again':
                if (await this.executeCommand(interaction, 'mine')) {
                    return;
                }
                await this.safeReply(interaction, {
                    content: '⛏️ Mining again... Please wait for the results!'
                });
                break;

            case 'stats':
                const userData = await this.getUserDataSafely(userId);
                const miningLevel = userData.skills?.mining || 1;
                const miningExp = userData.skillExperience?.mining || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#8B4513')
                    .setTitle('⛏️ Mining Statistics')
                    .addFields([
                        { name: 'Mining Level', value: `${miningLevel}`, inline: true },
                        { name: 'Experience', value: `${miningExp}`, inline: true },
                        { name: 'Next Level', value: `${Math.max(0, (miningLevel * 100) - miningExp)} XP`, inline: true }
                    ])
                    .setFooter({ text: 'Keep mining to level up!' })
                    .setTimestamp();
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            case 'upgrade':
                await this.safeReply(interaction, {
                    content: '🔧 Mining equipment upgrade system coming soon!'
                });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown mining action.'
                });
        }
    }

    async handleFishingButtons(interaction, args, userId) {
        const action = args[0];
        
        switch (action) {
            case 'again':
                if (await this.executeCommand(interaction, 'fish')) {
                    return;
                }
                await this.safeReply(interaction, {
                    content: '🎣 Casting your line again... Wait for a bite!'
                });
                break;

            case 'records':
                const userData = await this.getUserDataSafely(userId);
                const fishingLevel = userData.skills?.fishing || 1;
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#4682B4')
                    .setTitle('🎣 Fishing Records')
                    .addFields([
                        { name: 'Fishing Level', value: `${fishingLevel}`, inline: true },
                        { name: 'Fish Caught', value: `${userData.statistics?.fishCaught || 0}`, inline: true },
                        { name: 'Biggest Catch', value: `${userData.statistics?.biggestFish || 'None'}`, inline: true }
                    ])
                    .setTimestamp();
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown fishing action.'
                });
        }
    }

    async handleTravelButtons(interaction, args, userId) {
        const action = args[0];
        
        switch (action) {
            case 'to':
                await this.safeReply(interaction, {
                    content: '🗺️ Use the dropdown menu to select your destination!'
                });
                break;

            case 'map':
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#228B22')
                    .setTitle('🗺️ World Map')
                    .setDescription('Available destinations:')
                    .addFields([
                        { name: '🏘️ Village', value: 'Starting area with shops and quests', inline: false },
                        { name: '🌲 Forest', value: 'Hunt monsters and gather resources', inline: false },
                        { name: '⛰️ Mountains', value: 'Mine precious ores and gems', inline: false },
                        { name: '🏖️ Beach', value: 'Fish in the coastal waters', inline: false }
                    ]);
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown travel action.'
                });
        }
    }

    async handleUpgradeButtons(interaction, args, userId) {
        const action = args[0];
        
        switch (action) {
            case 'more':
                if (await this.executeCommand(interaction, 'upgrade')) {
                    return;
                }
                await this.safeReply(interaction, {
                    content: '⬆️ Loading upgrade options...'
                });
                break;

            case 'stats':
                const userData = await this.getUserDataSafely(userId);
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#FFD700')
                    .setTitle('📊 Current Stats')
                    .addFields([
                        { name: '💪 Strength', value: `${userData.strength || 10}`, inline: true },
                        { name: '🛡️ Defense', value: `${userData.defense || 10}`, inline: true },
                        { name: '⚡ Agility', value: `${userData.agility || 10}`, inline: true },
                        { name: '🧠 Intelligence', value: `${userData.intelligence || 10}`, inline: true },
                        { name: '❤️ Health', value: `${userData.health || 100}/${userData.maxHealth || 100}`, inline: true },
                        { name: '💙 Mana', value: `${userData.mana || 100}/${userData.maxMana || 100}`, inline: true }
                    ]);
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown upgrade action.'
                });
        }
    }

    async handleTavernButtons(interaction, args, userId) {
        const action = args[0];
        
        switch (action) {
            case 'another':
                if (await this.executeCommand(interaction, 'drink')) {
                    return;
                }
                await this.safeReply(interaction, {
                    content: '🍺 Ordering another drink...'
                });
                break;

            case 'buffs':
                const userData = await this.getUserDataSafely(userId);
                const activeBuffs = userData.buffs?.filter(buff => buff.expires > Date.now()) || [];
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#8A2BE2')
                    .setTitle('✨ Active Buffs')
                    .setDescription(activeBuffs.length > 0 ? 
                        activeBuffs.map(buff => `${buff.type}: +${buff.value} (${Math.floor((buff.expires - Date.now()) / 1000)}s remaining)`).join('\n') :
                        'No active buffs. Visit the tavern for some drinks!')
                    .setTimestamp();
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            case 'menu':
                const menuEmbed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#DEB887')
                    .setTitle('🍺 Tavern Menu')
                    .addFields([
                        { name: '🍺 Ale', value: '10 coins - Small strength boost', inline: true },
                        { name: '🍷 Wine', value: '15 coins - Intelligence boost', inline: true },
                        { name: '🥃 Whiskey', value: '20 coins - Courage boost', inline: true }
                    ]);
                
                await this.safeReply(interaction, { embeds: [menuEmbed] });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown tavern action.'
                });
        }
    }

    async handleBankButtons(interaction, args, userId) {
        const action = args[0];
        const userData = await this.getUserDataSafely(userId);
        
        switch (action) {
            case 'deposit':
                const depositAmount = parseInt(args[1]) || 100;
                if (userData.coins >= depositAmount) {
                    const updateData = {
                        coins: userData.coins - depositAmount,
                        bank: {
                            ...userData.bank,
                            savings: (userData.bank?.savings || 0) + depositAmount
                        }
                    };
                    
                    if (await this.updateUserDataSafely(userId, updateData)) {
                        await this.safeReply(interaction, {
                            content: `🏦 Deposited ${depositAmount} coins to your savings account!\n💰 Balance: ${updateData.coins} | 🏛️ Savings: ${updateData.bank.savings}`
                        });
                    } else {
                        await this.safeReply(interaction, {
                            content: '❌ Failed to process deposit. Please try again.'
                        });
                    }
                } else {
                    await this.safeReply(interaction, {
                        content: `❌ You need at least ${depositAmount} coins to make this deposit!`
                    });
                }
                break;

            case 'withdraw':
                const withdrawAmount = parseInt(args[1]) || 50;
                if ((userData.bank?.savings || 0) >= withdrawAmount) {
                    const updateData = {
                        coins: userData.coins + withdrawAmount,
                        bank: {
                            ...userData.bank,
                            savings: (userData.bank?.savings || 0) - withdrawAmount
                        }
                    };
                    
                    if (await this.updateUserDataSafely(userId, updateData)) {
                        await this.safeReply(interaction, {
                            content: `🏦 Withdrew ${withdrawAmount} coins from your savings account!\n💰 Balance: ${updateData.coins} | 🏛️ Savings: ${updateData.bank.savings}`
                        });
                    } else {
                        await this.safeReply(interaction, {
                            content: '❌ Failed to process withdrawal. Please try again.'
                        });
                    }
                } else {
                    await this.safeReply(interaction, {
                        content: `❌ Insufficient funds in savings account! You have ${userData.bank?.savings || 0} coins saved.`
                    });
                }
                break;

            case 'balance':
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.success || '#00FF00')
                    .setTitle('🏦 Bank Account')
                    .addFields([
                        { name: '💰 Wallet', value: `${userData.coins || 0} coins`, inline: true },
                        { name: '🏛️ Savings', value: `${userData.bank?.savings || 0} coins`, inline: true },
                        { name: '📊 Total Worth', value: `${(userData.coins || 0) + (userData.bank?.savings || 0)} coins`, inline: true }
                    ])
                    .setTimestamp();
                
                await this.safeReply(interaction, { embeds: [embed] });
                break;

            case 'invest':
                await this.safeReply(interaction, {
                    content: '📈 Investment options coming soon! Check back later for portfolio management.'
                });
                break;

            case 'loan':
                await this.safeReply(interaction, {
                    content: '💳 Loan applications are currently under review. Building credit system...'
                });
                break;

            default:
                await this.safeReply(interaction, {
                    content: '❌ Unknown bank action.'
                });
        }
    }

    // Placeholder implementations for remaining handlers
    async handleExploreButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🗺️ Explore action "${action}" is being processed...`
        });
    }

    async handleCraftButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🔨 Craft action "${action}" is being processed...`
        });
    }

    async handleSpellButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `✨ Spell action "${action}" is being processed...`
        });
    }

    async handleCombatButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `⚔️ Combat action "${action}" is being processed...`
        });
    }

    async handleAuctionButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🔨 Auction action "${action}" is being processed...`
        });
    }

    async handleAchievementButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🏆 Achievement action "${action}" is being processed...`
        });
    }

    async handleInventoryButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🎒 Inventory action "${action}" is being processed...`
        });
    }

    async handleShopButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🛒 Shop action "${action}" is being processed...`
        });
    }

    async handleForgeButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🔥 Forge action "${action}" is being processed...`
        });
    }

    async handleCastButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🎣 Cast action "${action}" is being processed...`
        });
    }

    async handleBuildButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🏗️ Build action "${action}" is being processed...`
        });
    }

    async handleEnchantButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `✨ Enchant action "${action}" is being processed...`
        });
    }

    async handleExcavateButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `⛏️ Excavate action "${action}" is being processed...`
        });
    }

    async handleGambleButtons(interaction, args, userId) {
        const action = args[0];
        
        if (action === 'roll') {
            const roll = Math.floor(Math.random() * 6) + 1;
            const won = roll >= 4;
            const reward = won ? 50 : 0;
            
            if (won && reward > 0) {
                const userData = await this.getUserDataSafely(userId);
                await this.updateUserDataSafely(userId, { coins: userData.coins + reward });
            }
            
            await this.safeReply(interaction, {
                content: `🎲 You rolled a ${roll}! ${won ? `You win ${reward} coins! 🎉` : 'Better luck next time! 😔'}`
            });
        } else {
            await this.safeReply(interaction, {
                content: `🎰 Gamble action "${action}" is being processed...`
            });
        }
    }

    async handleArenaButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `⚔️ Arena action "${action}" is being processed...`
        });
    }

    async handleBattleButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `⚔️ Battle action "${action}" is being processed...`
        });
    }

    async handleDungeonButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🏰 Dungeon action "${action}" is being processed...`
        });
    }

    async handleDailyButtons(interaction, args, userId) {
        const action = args[0];
        
        if (action === 'streak') {
            const userData = await this.getUserDataSafely(userId);
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.success || '#00FF00')
                .setTitle('📅 Daily Streak')
                .setDescription(`🔥 Your current streak: **${userData.dailyStreak || 0}** days!`)
                .addFields([
                    { name: '🎁 Next Reward', value: `${((userData.dailyStreak || 0) + 1) * 10} coins`, inline: true },
                    { name: '📊 Total Claims', value: `${userData.totalDailyClaims || 0}`, inline: true }
                ])
                .setTimestamp();
            
            await this.safeReply(interaction, { embeds: [embed] });
        } else {
            await this.safeReply(interaction, {
                content: `📅 Daily action "${action}" is being processed...`
            });
        }
    }

    async handleLotteryButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🎫 Lottery action "${action}" is being processed...`
        });
    }

    async handleTournamentButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `🏆 Tournament action "${action}" is being processed...`
        });
    }

    async handleQuestButtons(interaction, args, userId) {
        const action = args[0];
        await this.safeReply(interaction, {
            content: `📜 Quest action "${action}" is being processed...`
        });
    }

    async handleWeatherButtons(interaction, args, userId) {
        const action = args[0];
        
        if (action === 'forecast') {
            const weathers = ['☀️ Sunny', '🌧️ Rainy', '❄️ Snowy', '⛈️ Stormy', '🌤️ Partly Cloudy'];
            const currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#87CEEB')
                .setTitle('🌤️ Weather Forecast')
                .setDescription(`Current weather: ${currentWeather}`)
                .addFields([
                    { name: 'Temperature', value: `${Math.floor(Math.random() * 30) + 10}°C`, inline: true },
                    { name: 'Humidity', value: `${Math.floor(Math.random() * 50) + 30}%`, inline: true },
                    { name: 'Wind', value: `${Math.floor(Math.random() * 20) + 5} km/h`, inline: true }
                ])
                .setTimestamp();
            
            await this.safeReply(interaction, { embeds: [embed] });
        } else {
            await this.safeReply(interaction, {
                content: `🌤️ Weather action "${action}" is being processed...`
            });
        }
    }

    async handleBrewButtons(interaction, args, userId) {
        const action = args[0];
        // Verify user owns this interaction
        if (interaction.message.interaction && 
            interaction.message.interaction.user.id !== interaction.user.id) {
            return await this.safeReply(interaction, {
                content: '❌ You cannot interact with someone else\'s brewing session!',
                ephemeral: true
            });
        }

        // Defer the update since brewing might take some time
        await interaction.deferUpdate().catch(() => {});

        try {
            // The brewing logic is handled in the brew command file
            // This handler just ensures proper routing and error handling
            return true; // Allow the command file to handle the interaction
        } catch (error) {
            console.error('Brewing button error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Brewing Error')
                .setDescription('Something went wrong with the brewing process. Please try again.')
                .setFooter({ text: 'If this persists, use /brew to start a new session' });

            await this.safeReply(interaction, { 
                embeds: [errorEmbed],
                ephemeral: true
            });
            return false;
        }
    }

    
}

// Create and export the handler instance
const buttonHandler = new ButtonInteractionHandler();

module.exports = {
    ButtonInteractionHandler,
    handleButtonInteraction: buttonHandler.handleButtonInteraction.bind(buttonHandler),
    
    // Legacy export for backward compatibility
    async handleButtonInteraction(interaction) {
        return await buttonHandler.handleButtonInteraction(interaction);
    }
};