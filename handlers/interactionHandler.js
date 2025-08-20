const { Collection } = require('discord.js');

class InteractionHandler {
    constructor(client, options = {}) {
        this.client = client;
        this.options = {
            enableLogging: options.enableLogging !== false,
            enableMetrics: options.enableMetrics !== false,
            enableCaching: options.enableCaching !== false,
            maxHandlerCache: options.maxHandlerCache || 1000,
            interactionTimeout: options.interactionTimeout || 15 * 60 * 1000, // 15 minutes
            enableDebug: options.enableDebug || false,
            ...options
        };

        // Core collections
        this.commands = client?.commands || new Collection();
        this.buttonHandlers = new Collection();
        this.selectMenuHandlers = new Collection();
        this.modalHandlers = new Collection();
        this.autocompleteHandlers = new Collection();
        this.contextMenuHandlers = new Collection();
        
        // Cooldown management
        this.cooldowns = new Collection();

        // Handler cache for performance
        this.handlerCache = new Collection();

        // Register default button handler
        this.buttonHandlers.set('default', require('./buttonHandler.js').handleButtonInteraction);
        
        // Metrics and monitoring
        this.metrics = {
            commandsExecuted: 0,
            buttonsHandled: 0,
            modalsHandled: 0,
            selectMenusHandled: 0,
            autocompletesHandled: 0,
            errors: 0,
            lastReset: Date.now()
        };

        // Active interactions tracking
        this.activeInteractions = new Collection();

        // Import utilities with fallback error handling
        this.initializeUtilities();

        // Start cleanup timer if enabled
        if (this.options.enableCaching) {
            this.startCleanupTimer();
        }
    }

    /**
     * Initialize utility modules with error handling
     */
    initializeUtilities() {
        try {
            this.commandValidator = require('../utils/commandValidator.js');
        } catch (error) {
            console.warn('Command validator not found, using basic validation:', error.message);
            this.commandValidator = this.createBasicValidator();
        }

        try {
            this.cooldownManager = require('../utils/cooldownManager.js');
        } catch (error) {
            console.warn('Cooldown manager not found, using basic cooldown system:', error.message);
            this.cooldownManager = this.createBasicCooldownManager();
        }

        try {
            this.errorHandler = require('../utils/commandErrorHandler.js');
        } catch (error) {
            console.warn('Error handler not found, using basic error handling:', error.message);
            this.errorHandler = this.createBasicErrorHandler();
        }
    }

    /**
     * Register a command with enhanced validation
     * @param {Object} command - Command object
     * @param {Object} options - Registration options
     */
    registerCommand(command, options = {}) {
        try {
            // Validate command structure
            if (!command || typeof command !== 'object') {
                throw new Error('Command must be a valid object');
            }

            if (!command.data || !command.execute) {
                throw new Error('Command must have both data and execute properties');
            }

            if (!command.data.name) {
                throw new Error('Command data must have a name property');
            }

            const commandName = command.data.name;

            // Validate command using validator if available
            if (this.commandValidator && this.commandValidator.validateCommand) {
                const validation = this.commandValidator.validateCommand(command);
                if (!validation.isValid) {
                    console.error(`Command validation failed for ${commandName}:`, validation.errors);
                    if (options.strict !== false) {
                        throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
                    }
                }
            }

            // Register main command
            this.commands.set(commandName, command);

            // Register component handlers
            this.registerComponentHandlers(command, commandName);

            // Register autocomplete handler
            if (command.autocomplete) {
                this.autocompleteHandlers.set(commandName, command.autocomplete.bind(command));
            }

            // Register context menu handlers if present
            if (command.contextMenuHandlers) {
                this.registerContextMenuHandlers(command, commandName);
            }

            if (this.options.enableLogging) {
                console.log(`✅ Registered command: ${commandName}`);
            }

            return true;

        } catch (error) {
            console.error(`Failed to register command:`, error);
            return false;
        }
    }

    /**
     * Register component handlers for a command
     * @param {Object} command - Command object
     * @param {string} commandName - Command name
     */
    registerComponentHandlers(command, commandName) {
        // Register button handlers
        if (command.buttonHandlers) {
            for (const [id, handler] of Object.entries(command.buttonHandlers)) {
                if (typeof handler === 'function') {
                    const fullId = `${commandName}_${id}`;
                    this.buttonHandlers.set(fullId, handler.bind(command));
                }
            }
        }

        // Register select menu handlers
        if (command.selectMenuHandlers) {
            for (const [id, handler] of Object.entries(command.selectMenuHandlers)) {
                if (typeof handler === 'function') {
                    const fullId = `${commandName}_${id}`;
                    this.selectMenuHandlers.set(fullId, handler.bind(command));
                }
            }
        }

        // Register modal handlers
        if (command.modalHandlers) {
            for (const [id, handler] of Object.entries(command.modalHandlers)) {
                if (typeof handler === 'function') {
                    const fullId = `${commandName}_${id}`;
                    this.modalHandlers.set(fullId, handler.bind(command));
                }
            }
        }
    }

    /**
     * Register context menu handlers
     * @param {Object} command - Command object
     * @param {string} commandName - Command name
     */
    registerContextMenuHandlers(command, commandName) {
        for (const [id, handler] of Object.entries(command.contextMenuHandlers)) {
            if (typeof handler === 'function') {
                this.contextMenuHandlers.set(`${commandName}_${id}`, handler.bind(command));
            }
        }
    }

    /**
     * Main interaction handler with comprehensive error handling
     * @param {Interaction} interaction - Discord interaction
     */
    async handleInteraction(interaction) {
        if (!interaction) {
            console.error('Interaction handler called with null/undefined interaction');
            return;
        }

        const interactionId = interaction.id;
        const startTime = Date.now();

        try {
            // Track active interaction
            this.activeInteractions.set(interactionId, {
                type: interaction.type,
                user: interaction.user?.id,
                guild: interaction.guild?.id,
                startTime
            });

            // Handle different interaction types
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || 
                       interaction.isUserSelectMenu() || interaction.isChannelSelectMenu() || 
                       interaction.isMentionableSelectMenu()) {
                await this.handleSelectMenu(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModal(interaction);
            } else if (interaction.isAutocomplete()) {
                await this.handleAutocomplete(interaction);
            } else if (interaction.isContextMenuCommand()) {
                await this.handleContextMenu(interaction);
            } else {
                console.warn(`Unhandled interaction type: ${interaction.type}`);
            }

        } catch (error) {
            console.error('Critical error in interaction handler:', error);
            await this.handleInteractionError(interaction, error);
            
            if (this.options.enableMetrics) {
                this.metrics.errors++;
            }
        } finally {
            // Clean up tracking
            this.activeInteractions.delete(interactionId);
            
            // Log performance if debug enabled
            if (this.options.enableDebug) {
                const duration = Date.now() - startTime;
                console.log(`Interaction ${interactionId} processed in ${duration}ms`);
            }
        }
    }

    /**
     * Handle slash commands with enhanced validation
     * @param {ChatInputCommandInteraction} interaction - Slash command interaction
     */
    async handleSlashCommand(interaction) {
        const command = this.commands.get(interaction.commandName);
        
        if (!command) {
            await this.safeReply(interaction, {
                content: '❌ Command not found or not properly loaded.',
                ephemeral: true
            });
            return;
        }

        try {
            // Validate command structure if validator available
            if (this.commandValidator?.validateCommand) {
                const validationResult = this.commandValidator.validateCommand(command);
                if (!validationResult.isValid) {
                    console.error(`Command validation failed for ${interaction.commandName}:`, validationResult.errors);
                    await this.safeReply(interaction, {
                        content: '❌ This command is not properly configured. Please contact an administrator.',
                        ephemeral: true
                    });
                    return;
                }
            }

            // Check cooldown
            if (this.cooldownManager) {
                const cooldownResult = await this.checkCommandCooldown(interaction, command);
                if (cooldownResult.onCooldown) {
                    return; // Cooldown message already sent
                }
            }

            // Validate interaction requirements
            if (this.commandValidator?.validateInteraction && command.requirements) {
                const interactionValidation = this.commandValidator.validateInteraction(interaction, command.requirements);
                if (!interactionValidation.valid) {
                    await this.safeReply(interaction, {
                        content: `❌ ${interactionValidation.errors.join('\n')}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            // Validate options
            if (this.commandValidator?.validateOptions) {
                const optionsValidation = this.commandValidator.validateOptions(command, interaction);
                if (!optionsValidation.valid) {
                    await this.safeReply(interaction, {
                        content: `❌ Invalid options:\n${optionsValidation.errors.join('\n')}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            // Set cooldown before executing command
            if (command.cooldown && this.cooldownManager?.setCooldown) {
                await this.cooldownManager.setCooldown(interaction.commandName, interaction.user.id, command.cooldown);
            }

            // Execute command
            await command.execute(interaction);
            
            if (this.options.enableMetrics) {
                this.metrics.commandsExecuted++;
            }

        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await this.handleCommandError(interaction, error, interaction.commandName);
        }
    }

    /**
     * Handle button interactions
     * @param {ButtonInteraction} interaction - Button interaction
     */
    async handleButton(interaction) {
        try {
            const { handler, commandName, action } = this.parseCustomId(interaction.customId, 'button');
            
            if (handler) {
                await handler(interaction, action);
                if (this.options.enableMetrics) {
                    this.metrics.buttonsHandled++;
                }
            } else {
                await this.safeReply(interaction, {
                    content: '❌ This button action is no longer available.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error(`Error handling button ${interaction.customId}:`, error);
            await this.handleInteractionError(interaction, error);
        }
    }

    /**
     * Handle select menu interactions
     * @param {SelectMenuInteraction} interaction - Select menu interaction
     */
    async handleSelectMenu(interaction) {
        try {
            const { handler, commandName, action } = this.parseCustomId(interaction.customId, 'selectMenu');
            
            if (handler) {
                await handler(interaction, action);
                if (this.options.enableMetrics) {
                    this.metrics.selectMenusHandled++;
                }
            } else {
                await this.safeReply(interaction, {
                    content: '❌ This menu action is no longer available.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error(`Error handling select menu ${interaction.customId}:`, error);
            await this.handleInteractionError(interaction, error);
        }
    }

    /**
     * Handle modal interactions
     * @param {ModalSubmitInteraction} interaction - Modal interaction
     */
    async handleModal(interaction) {
        try {
            const { handler, commandName, action } = this.parseCustomId(interaction.customId, 'modal');
            
            if (handler) {
                await handler(interaction, action);
                if (this.options.enableMetrics) {
                    this.metrics.modalsHandled++;
                }
            } else {
                await this.safeReply(interaction, {
                    content: '❌ This modal action is no longer available.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error(`Error handling modal ${interaction.customId}:`, error);
            await this.handleInteractionError(interaction, error);
        }
    }

    /**
     * Handle autocomplete interactions
     * @param {AutocompleteInteraction} interaction - Autocomplete interaction
     */
    async handleAutocomplete(interaction) {
        try {
            const handler = this.autocompleteHandlers.get(interaction.commandName) ||
                           this.commands.get(interaction.commandName)?.autocomplete;

            if (handler) {
                await handler(interaction);
                if (this.options.enableMetrics) {
                    this.metrics.autocompletesHandled++;
                }
            } else {
                await interaction.respond([]);
            }

        } catch (error) {
            console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
            try {
                await interaction.respond([]);
            } catch (respondError) {
                console.error('Failed to respond to autocomplete:', respondError);
            }
        }
    }

    /**
     * Handle context menu interactions
     * @param {ContextMenuCommandInteraction} interaction - Context menu interaction
     */
    async handleContextMenu(interaction) {
        try {
            const command = this.commands.get(interaction.commandName);
            
            if (command?.execute) {
                await command.execute(interaction);
                if (this.options.enableMetrics) {
                    this.metrics.commandsExecuted++;
                }
            } else {
                await this.safeReply(interaction, {
                    content: '❌ Context menu command not found.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error(`Error handling context menu ${interaction.commandName}:`, error);
            await this.handleCommandError(interaction, error, interaction.commandName);
        }
    }

    /**
     * Parse custom ID to find appropriate handler
     * @param {string} customId - Custom ID to parse
     * @param {string} type - Type of interaction
     * @returns {Object} - Handler information
     */
    parseCustomId(customId, type) {
        if (!customId) return { handler: null, commandName: null, action: null };

        // Check cache first
        const cacheKey = `${type}_${customId}`;
        if (this.options.enableCaching && this.handlerCache.has(cacheKey)) {
            return this.handlerCache.get(cacheKey);
        }

        const [commandName, ...actionParts] = customId.split('_');
        const action = actionParts.join('_');
        let handler = null;

        // Get handler from appropriate collection
        const handlerCollections = {
            button: this.buttonHandlers,
            selectMenu: this.selectMenuHandlers,
            modal: this.modalHandlers
        };

        const collection = handlerCollections[type];
        if (collection) {
            // Special handling for manage command buttons
            if (commandName === 'manage') {
                const buttonHandler = require('./buttonHandler.js');
                handler = buttonHandler.handleButtonInteraction.bind(buttonHandler);
            }
            // Try exact match first
            handler = collection.get(customId);
            
            // Fallback to command-based handler
            if (!handler) {
                const command = this.commands.get(commandName);
                if (command) {
                    const methodName = `handle${type.charAt(0).toUpperCase() + type.slice(1)}`;
                    handler = command[methodName]?.bind(command);
                }
            }
        }

        const result = { handler, commandName, action };

        // Cache result if caching enabled
        if (this.options.enableCaching && this.handlerCache.size < this.options.maxHandlerCache) {
            this.handlerCache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * Check command cooldown
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} command - Command object
     * @returns {Object} - Cooldown result
     */
    async checkCommandCooldown(interaction, command) {
        if (!command.cooldown) {
            return { onCooldown: false };
        }

        try {
            const { user } = interaction;
            const cooldownTime = command.cooldown * 1000;

            if (!this.cooldowns.has(command.data.name)) {
                this.cooldowns.set(command.data.name, new Collection());
            }

            const timestamps = this.cooldowns.get(command.data.name);
            const now = Date.now();

            if (timestamps.has(user.id)) {
                const expirationTime = timestamps.get(user.id) + cooldownTime;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    await this.safeReply(interaction, {
                        content: `⏳ Please wait ${timeLeft.toFixed(1)} seconds before using \`${command.data.name}\` again.`,
                        flags: { ephemeral: true }
                    });
                    return { onCooldown: true };
                }
            }

            timestamps.set(user.id, now);
            setTimeout(() => timestamps.delete(user.id), cooldownTime);

            return { onCooldown: false };

        } catch (error) {
            console.error('Error checking cooldown:', error);
            return { onCooldown: false }; // Don't block users on cooldown errors
        }
    }

    /**
     * Handle command errors using error handler
     * @param {Interaction} interaction - Discord interaction
     * @param {Error} error - The error
     * @param {string} commandName - Command name
     */
    async handleCommandError(interaction, error, commandName) {
        if (this.errorHandler?.handleCommandError) {
            await this.errorHandler.handleCommandError(interaction, error, commandName);
        } else {
            await this.handleInteractionError(interaction, error);
        }
    }

    /**
     * Handle interaction errors with fallback
     * @param {Interaction} interaction - Discord interaction
     * @param {Error} error - The error
     */
    async handleInteractionError(interaction, error) {
        if (this.errorHandler?.handleInteractionError) {
            await this.errorHandler.handleInteractionError(interaction, error);
        } else {
            // Basic fallback error handling
            const errorMessage = '❌ An unexpected error occurred. Please try again later.';
            await this.safeReply(interaction, { content: errorMessage, ephemeral: true });
        }
    }

    /**
     * Safely reply to interaction with multiple fallbacks
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} options - Reply options
     */
    async safeReply(interaction, options) {
        if (!interaction || !interaction.isRepliable()) {
            console.warn('Cannot reply to interaction: not repliable');
            return false;
        }

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(options);
            } else if (interaction.deferred && !interaction.replied) {
                await interaction.editReply(options);
            } else {
                // Force ephemeral for followups
                options.ephemeral = true;
                await interaction.followUp(options);
            }
            return true;
        } catch (error) {
            console.error('Failed to send interaction response:', error);
            return false;
        }
    }

    /**
     * Create basic validator fallback
     * @returns {Object} - Basic validator
     */
    createBasicValidator() {
        return {
            validateCommand: (command) => ({
                isValid: !!(command && command.data && command.execute),
                errors: []
            }),
            validateInteraction: () => ({ valid: true, errors: [] }),
            validateOptions: () => ({ valid: true, errors: [] })
        };
    }

    /**
     * Create basic cooldown manager fallback
     * @returns {Object} - Basic cooldown manager
     */
    createBasicCooldownManager() {
        const cooldowns = new Collection();
        
        return {
            checkCooldown: (commandName, userId) => {
                const key = `${commandName}_${userId}`;
                const cooldownEnd = cooldowns.get(key);
                if (!cooldownEnd) return null;
                
                const timeLeft = Math.ceil((cooldownEnd - Date.now()) / 1000);
                return timeLeft > 0 ? timeLeft : null;
            },
            setCooldown: (commandName, userId, seconds) => {
                const key = `${commandName}_${userId}`;
                cooldowns.set(key, Date.now() + (seconds * 1000));
            }
        };
    }

    /**
     * Create basic error handler fallback
     * @returns {Object} - Basic error handler
     */
    createBasicErrorHandler() {
        return {
            handleCommandError: async (interaction, error, commandName) => {
                console.error(`Error in command ${commandName}:`, error);
                await this.safeReply(interaction, {
                    content: '❌ An error occurred while executing this command.',
                    ephemeral: true
                });
            },
            handleInteractionError: async (interaction, error) => {
                console.error('Interaction error:', error);
                await this.safeReply(interaction, {
                    content: '❌ An unexpected error occurred.',
                    ephemeral: true
                });
            }
        };
    }

    /**
     * Start cleanup timer for cache and metrics
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            // Clean handler cache if it's getting too large
            if (this.handlerCache.size > this.options.maxHandlerCache * 0.8) {
                const entriesToRemove = Math.floor(this.handlerCache.size * 0.2);
                const entries = Array.from(this.handlerCache.keys());
                
                for (let i = 0; i < entriesToRemove; i++) {
                    this.handlerCache.delete(entries[i]);
                }
            }

            // Clean up old active interactions
            const now = Date.now();
            this.activeInteractions.forEach((data, id) => {
                if (now - data.startTime > this.options.interactionTimeout) {
                    this.activeInteractions.delete(id);
                }
            });

        }, 5 * 60 * 1000); // Run every 5 minutes

        // Don't keep process alive
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Get handler statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        return {
            commands: this.commands.size,
            buttonHandlers: this.buttonHandlers.size,
            selectMenuHandlers: this.selectMenuHandlers.size,
            modalHandlers: this.modalHandlers.size,
            autocompleteHandlers: this.autocompleteHandlers.size,
            contextMenuHandlers: this.contextMenuHandlers.size,
            handlerCacheSize: this.handlerCache.size,
            activeInteractions: this.activeInteractions.size,
            metrics: { ...this.metrics },
            uptime: Date.now() - this.metrics.lastReset
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            commandsExecuted: 0,
            buttonsHandled: 0,
            modalsHandled: 0,
            selectMenusHandled: 0,
            autocompletesHandled: 0,
            errors: 0,
            lastReset: Date.now()
        };
    }

    /**
     * Destroy handler and clean up resources
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.commands.clear();
        this.buttonHandlers.clear();
        this.selectMenuHandlers.clear();
        this.modalHandlers.clear();
        this.autocompleteHandlers.clear();
        this.contextMenuHandlers.clear();
        this.handlerCache.clear();
        this.activeInteractions.clear();
    }
}

module.exports = InteractionHandler;