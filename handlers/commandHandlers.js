// Command Handlers with Error Handling and Context Binding
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');

class CommandHandlers {
    constructor(database, logger) {
        this.database = database;
        this.logger = logger;
        
        // Bind methods to maintain context
        this.shopHandlers = {
            buttonHandlers: {
                back: this.handleShopBack.bind(this),
                buy_1: this.handleShopBuy1.bind(this),
                buy_5: this.handleShopBuy5.bind(this)
            },
            selectMenuHandlers: {
                category: this.handleShopCategory.bind(this),
                item: this.handleShopItem.bind(this)
            }
        };
        
        this.helpHandlers = {
            buttonHandlers: {
                back: this.handleHelpBack.bind(this),
                getting_started: this.handleGettingStarted.bind(this),
                quick_ref: this.handleQuickReference.bind(this),
                next_steps: this.handleNextSteps.bind(this)
            },
            selectMenuHandlers: {
                category: this.handleHelpCategory.bind(this),
                command: this.handleHelpCommand.bind(this)
            }
        };
    }

    // Utility Methods
    async getUserData(userId) {
        try {
            if (!this.database) {
                throw new Error('Database not initialized');
            }
            
            const userData = await this.database.getUser(userId);
            if (!userData) {
                // Create default user data if not exists
                const defaultData = {
                    id: userId,
                    coins: 1000,
                    inventory: {},
                    level: 1,
                    experience: 0
                };
                await this.database.createUser(defaultData);
                return defaultData;
            }
            return userData;
        } catch (error) {
            this.logger?.error('Error getting user data:', error);
            throw new Error('Failed to retrieve user data');
        }
    }

    async updateUserData(userId, updateData) {
        try {
            if (!this.database) {
                throw new Error('Database not initialized');
            }
            
            await this.database.updateUser(userId, updateData);
            return true;
        } catch (error) {
            this.logger?.error('Error updating user data:', error);
            return false;
        }
    }

    async safeReply(interaction, content, ephemeral = false) {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(content);
            } else {
                return await interaction.reply({ ...content, ephemeral });
            }
        } catch (error) {
            this.logger?.error('Error replying to interaction:', error);
            try {
                await interaction.followUp({ 
                    content: '❌ An error occurred while processing your request.', 
                    ephemeral: true 
                });
            } catch (followUpError) {
                this.logger?.error('Error sending follow-up:', followUpError);
            }
        }
    }

    // Shop Handler Methods
    async handleShopBack(interaction) {
        try {
            const userData = await this.getUserData(interaction.user.id);
            await this.showMainShop(interaction, userData);
        } catch (error) {
            this.logger?.error('Error handling shop back:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to navigate back to shop.',
                ephemeral: true
            });
        }
    }

    async handleShopBuy1(interaction) {
        try {
            const userData = await this.getUserData(interaction.user.id);
            const itemId = this.extractItemId(interaction);
            
            if (!itemId) {
                await this.safeReply(interaction, {
                    content: '❌ Could not identify the item to purchase.',
                    ephemeral: true
                });
                return;
            }
            
            await this.handlePurchase(interaction, itemId, 1, userData);
        } catch (error) {
            this.logger?.error('Error handling buy 1:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to process purchase.',
                ephemeral: true
            });
        }
    }

    async handleShopBuy5(interaction) {
        try {
            const userData = await this.getUserData(interaction.user.id);
            const itemId = this.extractItemId(interaction);
            
            if (!itemId) {
                await this.safeReply(interaction, {
                    content: '❌ Could not identify the item to purchase.',
                    ephemeral: true
                });
                return;
            }
            
            await this.handlePurchase(interaction, itemId, 5, userData);
        } catch (error) {
            this.logger?.error('Error handling buy 5:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to process purchase.',
                ephemeral: true
            });
        }
    }

    async handleShopCategory(interaction) {
        try {
            const userData = await this.getUserData(interaction.user.id);
            const categoryId = interaction.values?.[0];
            
            if (!categoryId) {
                await this.safeReply(interaction, {
                    content: '❌ Invalid category selection.',
                    ephemeral: true
                });
                return;
            }
            
            await this.showCategory(interaction, categoryId, userData);
        } catch (error) {
            this.logger?.error('Error handling shop category:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load category.',
                ephemeral: true
            });
        }
    }

    async handleShopItem(interaction) {
        try {
            const userData = await this.getUserData(interaction.user.id);
            const itemId = interaction.values?.[0];
            
            if (!itemId) {
                await this.safeReply(interaction, {
                    content: '❌ Invalid item selection.',
                    ephemeral: true
                });
                return;
            }
            
            await this.handlePurchase(interaction, itemId, 1, userData);
        } catch (error) {
            this.logger?.error('Error handling shop item:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to process item selection.',
                ephemeral: true
            });
        }
    }

    // Help Handler Methods
    async handleHelpBack(interaction) {
        try {
            await this.showMainHelp(interaction);
        } catch (error) {
            this.logger?.error('Error handling help back:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to navigate back to help menu.',
                ephemeral: true
            });
        }
    }

    async handleGettingStarted(interaction) {
        try {
            await this.showGettingStarted(interaction);
        } catch (error) {
            this.logger?.error('Error showing getting started:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load getting started guide.',
                ephemeral: true
            });
        }
    }

    async handleQuickReference(interaction) {
        try {
            await this.showQuickReference(interaction);
        } catch (error) {
            this.logger?.error('Error showing quick reference:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load quick reference.',
                ephemeral: true
            });
        }
    }

    async handleNextSteps(interaction) {
        try {
            await this.showNextSteps(interaction);
        } catch (error) {
            this.logger?.error('Error showing next steps:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load next steps guide.',
                ephemeral: true
            });
        }
    }

    async handleHelpCategory(interaction) {
        try {
            const categoryId = interaction.values?.[0];
            
            if (!categoryId) {
                await this.safeReply(interaction, {
                    content: '❌ Invalid category selection.',
                    ephemeral: true
                });
                return;
            }
            
            await this.showCategoryHelp(interaction, categoryId);
        } catch (error) {
            this.logger?.error('Error handling help category:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load category help.',
                ephemeral: true
            });
        }
    }

    async handleHelpCommand(interaction) {
        try {
            const commandId = interaction.values?.[0];
            
            if (!commandId) {
                await this.safeReply(interaction, {
                    content: '❌ Invalid command selection.',
                    ephemeral: true
                });
                return;
            }
            
            await this.showCommandHelp(interaction, commandId);
        } catch (error) {
            this.logger?.error('Error handling help command:', error);
            await this.safeReply(interaction, {
                content: '❌ Failed to load command help.',
                ephemeral: true
            });
        }
    }

    // Helper Methods
    extractItemId(interaction) {
        try {
            return interaction.message?.embeds?.[0]?.fields?.[0]?.name?.split(' ')?.[1] || null;
        } catch (error) {
            this.logger?.error('Error extracting item ID:', error);
            return null;
        }
    }

    // Shop Implementation Methods (you'll need to implement these based on your needs)
    async showMainShop(interaction, userData) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Shop')
            .setDescription('Welcome to the shop! Select a category to browse items.')
            .setColor(0x00AE86)
            .addFields(
                { name: '💰 Your Balance', value: `${userData.coins || 0} coins`, inline: true }
            );

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_category')
            .setPlaceholder('Select a category')
            .addOptions([
                { label: 'Weapons', value: 'weapons', emoji: '⚔️' },
                { label: 'Armor', value: 'armor', emoji: '🛡️' },
                { label: 'Consumables', value: 'consumables', emoji: '🧪' },
                { label: 'Misc', value: 'misc', emoji: '📦' }
            ]);

        const row = new ActionRowBuilder().addComponents(categorySelect);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async showCategory(interaction, categoryId, userData) {
        // Implement category display logic
        const embed = new EmbedBuilder()
            .setTitle(`🛒 Shop - ${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}`)
            .setDescription(`Browse ${categoryId} items`)
            .setColor(0x00AE86);

        const backButton = new ButtonBuilder()
            .setCustomId('shop_back')
            .setLabel('Back to Shop')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async handlePurchase(interaction, itemId, quantity, userData) {
        // Implement purchase logic
        const embed = new EmbedBuilder()
            .setTitle('Purchase Confirmation')
            .setDescription(`Processing purchase of ${quantity}x ${itemId}...`)
            .setColor(0x00AE86);

        await this.safeReply(interaction, {
            embeds: [embed],
            ephemeral: true
        });
    }

    // Help Implementation Methods
    async showMainHelp(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📚 Help Center')
            .setDescription('Welcome to the help center! Get assistance with commands and features.')
            .setColor(0x0099FF)
            .addFields(
                { name: '🚀 Getting Started', value: 'New to the bot? Start here!', inline: true },
                { name: '📖 Quick Reference', value: 'Command cheat sheet', inline: true },
                { name: '➡️ Next Steps', value: 'Advanced features guide', inline: true }
            );

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help_getting_started')
                .setLabel('Getting Started')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚀'),
            new ButtonBuilder()
                .setCustomId('help_quick_ref')
                .setLabel('Quick Reference')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📖'),
            new ButtonBuilder()
                .setCustomId('help_next_steps')
                .setLabel('Next Steps')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➡️')
        );

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [buttons]
        });
    }

    async showGettingStarted(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🚀 Getting Started')
            .setDescription('Welcome! Here\'s how to get started with the bot.')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Step 1', value: 'Run `/help` to see available commands', inline: false },
                { name: 'Step 2', value: 'Check your balance with `/balance`', inline: false },
                { name: 'Step 3', value: 'Visit the `/shop` to buy items', inline: false }
            );

        const backButton = new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async showQuickReference(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Quick Reference')
            .setDescription('Common commands at a glance')
            .setColor(0xFFFF00)
            .addFields(
                { name: '💰 Economy', value: '`/balance`, `/daily`, `/shop`', inline: true },
                { name: '🎮 Games', value: '`/coinflip`, `/dice`, `/slots`', inline: true },
                { name: 'ℹ️ Info', value: '`/help`, `/stats`, `/profile`', inline: true }
            );

        const backButton = new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async showNextSteps(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('➡️ Next Steps')
            .setDescription('Ready to explore advanced features?')
            .setColor(0xFF6600)
            .addFields(
                { name: 'Leveling Up', value: 'Gain experience by using commands and playing games', inline: false },
                { name: 'Advanced Trading', value: 'Use the marketplace to trade with other users', inline: false },
                { name: 'Custom Settings', value: 'Personalize your experience with `/settings`', inline: false }
            );

        const backButton = new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async showCategoryHelp(interaction, categoryId) {
        const embed = new EmbedBuilder()
            .setTitle(`📚 ${categoryId} Help`)
            .setDescription(`Help for ${categoryId} category`)
            .setColor(0x0099FF);

        const backButton = new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }

    async showCommandHelp(interaction, commandId) {
        const embed = new EmbedBuilder()
            .setTitle(`📝 ${commandId} Command`)
            .setDescription(`Detailed help for the ${commandId} command`)
            .setColor(0x0099FF);

        const backButton = new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Back to Help')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await this.safeReply(interaction, {
            embeds: [embed],
            components: [row]
        });
    }
}

module.exports = CommandHandlers;