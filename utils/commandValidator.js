
const { PermissionFlagsBits } = require('discord.js');

class CommandValidator {
    constructor() {
        this.validationCache = new Map();
        this.permissionMap = new Map();
        this.setupPermissionMap();
    }

    setupPermissionMap() {
        this.permissionMap.set('SEND_MESSAGES', PermissionFlagsBits.SendMessages);
        this.permissionMap.set('EMBED_LINKS', PermissionFlagsBits.EmbedLinks);
        this.permissionMap.set('ATTACH_FILES', PermissionFlagsBits.AttachFiles);
        this.permissionMap.set('READ_MESSAGE_HISTORY', PermissionFlagsBits.ReadMessageHistory);
        this.permissionMap.set('USE_EXTERNAL_EMOJIS', PermissionFlagsBits.UseExternalEmojis);
        this.permissionMap.set('ADD_REACTIONS', PermissionFlagsBits.AddReactions);
        this.permissionMap.set('MANAGE_MESSAGES', PermissionFlagsBits.ManageMessages);
        this.permissionMap.set('ADMINISTRATOR', PermissionFlagsBits.Administrator);
    }

    /**
     * Validate a command object structure
     * @param {Object} command - Command to validate
     * @returns {Object} - Validation result
     */
    validateCommand(command) {
        const errors = [];
        let isValid = true;

        try {
            // Check basic structure
            if (!command) {
                errors.push('Command object is null or undefined');
                return { isValid: false, errors };
            }

            if (!command.data) {
                errors.push('Command must have a data property');
                isValid = false;
            } else {
                // Validate command data
                if (!command.data.name) {
                    errors.push('Command data must have a name');
                    isValid = false;
                } else if (typeof command.data.name !== 'string') {
                    errors.push('Command name must be a string');
                    isValid = false;
                } else if (command.data.name.length < 1 || command.data.name.length > 32) {
                    errors.push('Command name must be between 1 and 32 characters');
                    isValid = false;
                } else if (!/^[\w-]{1,32}$/.test(command.data.name)) {
                    errors.push('Command name contains invalid characters');
                    isValid = false;
                }

                if (!command.data.description) {
                    errors.push('Command data must have a description');
                    isValid = false;
                } else if (typeof command.data.description !== 'string') {
                    errors.push('Command description must be a string');
                    isValid = false;
                } else if (command.data.description.length < 1 || command.data.description.length > 100) {
                    errors.push('Command description must be between 1 and 100 characters');
                    isValid = false;
                }

                // Validate options if present
                if (command.data.options) {
                    const optionValidation = this.validateCommandOptions(command.data.options);
                    if (!optionValidation.isValid) {
                        errors.push(...optionValidation.errors);
                        isValid = false;
                    }
                }
            }

            // Check execute function
            if (!command.execute) {
                errors.push('Command must have an execute function');
                isValid = false;
            } else if (typeof command.execute !== 'function') {
                errors.push('Command execute must be a function');
                isValid = false;
            }

            // Validate cooldown if present
            if (command.cooldown !== undefined) {
                if (typeof command.cooldown !== 'number' || command.cooldown < 0) {
                    errors.push('Command cooldown must be a non-negative number');
                    isValid = false;
                } else if (command.cooldown > 3600) { // Max 1 hour
                    errors.push('Command cooldown cannot exceed 1 hour (3600 seconds)');
                    isValid = false;
                }
            }

            // Validate permissions if present
            if (command.permissions) {
                const permValidation = this.validatePermissions(command.permissions);
                if (!permValidation.isValid) {
                    errors.push(...permValidation.errors);
                    isValid = false;
                }
            }

            // Validate button handlers if present
            if (command.buttonHandlers) {
                const buttonValidation = this.validateHandlers(command.buttonHandlers, 'button');
                if (!buttonValidation.isValid) {
                    errors.push(...buttonValidation.errors);
                    isValid = false;
                }
            }

            // Validate select menu handlers if present
            if (command.selectMenuHandlers) {
                const selectValidation = this.validateHandlers(command.selectMenuHandlers, 'selectMenu');
                if (!selectValidation.isValid) {
                    errors.push(...selectValidation.errors);
                    isValid = false;
                }
            }

            // Validate modal handlers if present
            if (command.modalHandlers) {
                const modalValidation = this.validateHandlers(command.modalHandlers, 'modal');
                if (!modalValidation.isValid) {
                    errors.push(...modalValidation.errors);
                    isValid = false;
                }
            }

        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            isValid = false;
        }

        return { isValid, errors };
    }

    /**
     * Validate command options
     * @param {Array} options - Command options array
     * @returns {Object} - Validation result
     */
    validateCommandOptions(options) {
        const errors = [];
        let isValid = true;

        if (!Array.isArray(options)) {
            return { isValid: false, errors: ['Options must be an array'] };
        }

        if (options.length > 25) {
            errors.push('Commands cannot have more than 25 options');
            isValid = false;
        }

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            
            if (!option.name) {
                errors.push(`Option ${i} must have a name`);
                isValid = false;
            } else if (!/^[\w-]{1,32}$/.test(option.name)) {
                errors.push(`Option ${i} name contains invalid characters`);
                isValid = false;
            }

            if (!option.description) {
                errors.push(`Option ${i} must have a description`);
                isValid = false;
            } else if (option.description.length > 100) {
                errors.push(`Option ${i} description is too long (max 100 characters)`);
                isValid = false;
            }

            if (option.type === undefined) {
                errors.push(`Option ${i} must have a type`);
                isValid = false;
            }

            // Validate choices if present
            if (option.choices && Array.isArray(option.choices)) {
                if (option.choices.length > 25) {
                    errors.push(`Option ${i} cannot have more than 25 choices`);
                    isValid = false;
                }

                for (let j = 0; j < option.choices.length; j++) {
                    const choice = option.choices[j];
                    if (!choice.name || !choice.value) {
                        errors.push(`Option ${i} choice ${j} must have name and value`);
                        isValid = false;
                    }
                }
            }
        }

        return { isValid, errors };
    }

    /**
     * Validate permissions array
     * @param {Array} permissions - Permissions array
     * @returns {Object} - Validation result
     */
    validatePermissions(permissions) {
        const errors = [];
        let isValid = true;

        if (!Array.isArray(permissions)) {
            return { isValid: false, errors: ['Permissions must be an array'] };
        }

        for (const permission of permissions) {
            if (typeof permission !== 'string') {
                errors.push('All permissions must be strings');
                isValid = false;
                continue;
            }

            if (!this.permissionMap.has(permission) && !Object.values(PermissionFlagsBits).includes(permission)) {
                errors.push(`Unknown permission: ${permission}`);
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    /**
     * Validate handler objects
     * @param {Object} handlers - Handler object
     * @param {string} type - Handler type
     * @returns {Object} - Validation result
     */
    validateHandlers(handlers, type) {
        const errors = [];
        let isValid = true;

        if (typeof handlers !== 'object' || handlers === null) {
            return { isValid: false, errors: [`${type} handlers must be an object`] };
        }

        for (const [handlerName, handlerFunction] of Object.entries(handlers)) {
            if (typeof handlerFunction !== 'function') {
                errors.push(`${type} handler '${handlerName}' must be a function`);
                isValid = false;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(handlerName)) {
                errors.push(`${type} handler name '${handlerName}' contains invalid characters`);
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    /**
     * Validate interaction against command requirements
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} requirements - Command requirements
     * @returns {Object} - Validation result
     */
    validateInteraction(interaction, requirements) {
        const errors = [];
        let valid = true;

        try {
            if (!interaction) {
                return { valid: false, errors: ['Interaction is null or undefined'] };
            }

            // Check guild requirements
            if (requirements.guildOnly && !interaction.guild) {
                errors.push('This command can only be used in servers');
                valid = false;
            }

            if (requirements.dmOnly && interaction.guild) {
                errors.push('This command can only be used in direct messages');
                valid = false;
            }

            // Check user permissions
            if (requirements.userPermissions && interaction.guild) {
                const userPermissions = interaction.member?.permissions;
                
                if (!userPermissions) {
                    errors.push('Unable to check user permissions');
                    valid = false;
                } else {
                    for (const permission of requirements.userPermissions) {
                        const permissionFlag = this.permissionMap.get(permission) || permission;
                        
                        if (!userPermissions.has(permissionFlag)) {
                            errors.push(`You need the ${permission} permission to use this command`);
                            valid = false;
                        }
                    }
                }
            }

            // Check bot permissions
            if (requirements.botPermissions && interaction.guild) {
                const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
                const botPermissions = botMember?.permissions;
                
                if (!botPermissions) {
                    errors.push('Unable to check bot permissions');
                    valid = false;
                } else {
                    for (const permission of requirements.botPermissions) {
                        const permissionFlag = this.permissionMap.get(permission) || permission;
                        
                        if (!botPermissions.has(permissionFlag)) {
                            errors.push(`I need the ${permission} permission to execute this command`);
                            valid = false;
                        }
                    }
                }
            }

            // Check NSFW requirements
            if (requirements.nsfw && interaction.guild) {
                const channel = interaction.channel;
                if (!channel?.nsfw) {
                    errors.push('This command can only be used in NSFW channels');
                    valid = false;
                }
            }

            // Check owner requirements
            if (requirements.ownerOnly) {
                const ownerId = process.env.OWNER_ID || interaction.client.application?.owner?.id;
                if (interaction.user.id !== ownerId) {
                    errors.push('This command can only be used by the bot owner');
                    valid = false;
                }
            }

            // Check user level requirements
            if (requirements.minLevel && requirements.minLevel > 0) {
                // This would require database access to check user level
                // For now, just validate that the requirement exists
                if (typeof requirements.minLevel !== 'number') {
                    errors.push('Invalid minimum level requirement');
                    valid = false;
                }
            }

        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            valid = false;
        }

        return { valid, errors };
    }

    /**
     * Validate command options values
     * @param {Object} command - Command object
     * @param {Interaction} interaction - Discord interaction
     * @returns {Object} - Validation result
     */
    validateOptions(command, interaction) {
        const errors = [];
        let valid = true;

        try {
            if (!command.data?.options || !Array.isArray(command.data.options)) {
                return { valid: true, errors: [] }; // No options to validate
            }

            for (const option of command.data.options) {
                const value = interaction.options?.get(option.name)?.value;
                
                // Check required options
                if (option.required && (value === undefined || value === null)) {
                    errors.push(`Missing required option: ${option.name}`);
                    valid = false;
                    continue;
                }

                // Skip validation if option is not provided and not required
                if (value === undefined || value === null) {
                    continue;
                }

                // Validate string options
                if (option.type === 3) { // STRING type
                    if (typeof value !== 'string') {
                        errors.push(`Option ${option.name} must be a string`);
                        valid = false;
                    } else {
                        if (option.min_length && value.length < option.min_length) {
                            errors.push(`Option ${option.name} must be at least ${option.min_length} characters`);
                            valid = false;
                        }
                        if (option.max_length && value.length > option.max_length) {
                            errors.push(`Option ${option.name} must be no more than ${option.max_length} characters`);
                            valid = false;
                        }
                    }
                }

                // Validate integer options
                if (option.type === 4) { // INTEGER type
                    if (!Number.isInteger(value)) {
                        errors.push(`Option ${option.name} must be an integer`);
                        valid = false;
                    } else {
                        if (option.min_value !== undefined && value < option.min_value) {
                            errors.push(`Option ${option.name} must be at least ${option.min_value}`);
                            valid = false;
                        }
                        if (option.max_value !== undefined && value > option.max_value) {
                            errors.push(`Option ${option.name} must be no more than ${option.max_value}`);
                            valid = false;
                        }
                    }
                }

                // Validate number options
                if (option.type === 10) { // NUMBER type
                    if (typeof value !== 'number' || isNaN(value)) {
                        errors.push(`Option ${option.name} must be a number`);
                        valid = false;
                    } else {
                        if (option.min_value !== undefined && value < option.min_value) {
                            errors.push(`Option ${option.name} must be at least ${option.min_value}`);
                            valid = false;
                        }
                        if (option.max_value !== undefined && value > option.max_value) {
                            errors.push(`Option ${option.name} must be no more than ${option.max_value}`);
                            valid = false;
                        }
                    }
                }

                // Validate choices
                if (option.choices && Array.isArray(option.choices)) {
                    const validChoices = option.choices.map(choice => choice.value);
                    if (!validChoices.includes(value)) {
                        errors.push(`Option ${option.name} must be one of: ${validChoices.join(', ')}`);
                        valid = false;
                    }
                }
            }

        } catch (error) {
            errors.push(`Option validation error: ${error.message}`);
            valid = false;
        }

        return { valid, errors };
    }

    /**
     * Get validation cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            size: this.validationCache.size,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
            hits: this.cacheHits || 0,
            misses: this.cacheMisses || 0
        };
    }

    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Validate custom ID format
     * @param {string} customId - Custom ID to validate
     * @returns {boolean} - Whether the custom ID is valid
     */
    validateCustomId(customId) {
        if (!customId || typeof customId !== 'string') {
            return false;
        }

        // Discord custom IDs have a max length of 100 characters
        if (customId.length > 100) {
            return false;
        }

        // Check for valid characters (alphanumeric, underscore, hyphen)
        return /^[a-zA-Z0-9_-]+$/.test(customId);
    }

    /**
     * Validate embed structure
     * @param {Object} embed - Embed object to validate
     * @returns {Object} - Validation result
     */
    validateEmbed(embed) {
        const errors = [];
        let valid = true;

        try {
            if (!embed || typeof embed !== 'object') {
                return { valid: false, errors: ['Embed must be an object'] };
            }

            // Validate title
            if (embed.title && embed.title.length > 256) {
                errors.push('Embed title cannot exceed 256 characters');
                valid = false;
            }

            // Validate description
            if (embed.description && embed.description.length > 4096) {
                errors.push('Embed description cannot exceed 4096 characters');
                valid = false;
            }

            // Validate fields
            if (embed.fields) {
                if (!Array.isArray(embed.fields)) {
                    errors.push('Embed fields must be an array');
                    valid = false;
                } else if (embed.fields.length > 25) {
                    errors.push('Embed cannot have more than 25 fields');
                    valid = false;
                } else {
                    for (let i = 0; i < embed.fields.length; i++) {
                        const field = embed.fields[i];
                        if (!field.name || field.name.length > 256) {
                            errors.push(`Field ${i} name must exist and be under 256 characters`);
                            valid = false;
                        }
                        if (!field.value || field.value.length > 1024) {
                            errors.push(`Field ${i} value must exist and be under 1024 characters`);
                            valid = false;
                        }
                    }
                }
            }

            // Validate footer
            if (embed.footer?.text && embed.footer.text.length > 2048) {
                errors.push('Embed footer text cannot exceed 2048 characters');
                valid = false;
            }

            // Validate author
            if (embed.author?.name && embed.author.name.length > 256) {
                errors.push('Embed author name cannot exceed 256 characters');
                valid = false;
            }

            // Calculate total character count
            let totalChars = 0;
            if (embed.title) totalChars += embed.title.length;
            if (embed.description) totalChars += embed.description.length;
            if (embed.footer?.text) totalChars += embed.footer.text.length;
            if (embed.author?.name) totalChars += embed.author.name.length;
            if (embed.fields) {
                for (const field of embed.fields) {
                    totalChars += (field.name?.length || 0) + (field.value?.length || 0);
                }
            }

            if (totalChars > 6000) {
                errors.push('Total embed character count cannot exceed 6000 characters');
                valid = false;
            }

        } catch (error) {
            errors.push(`Embed validation error: ${error.message}`);
            valid = false;
        }

        return { valid, errors };
    }
}

// Create singleton instance
const commandValidator = new CommandValidator();

module.exports = {
    CommandValidator,
    validateCommand: commandValidator.validateCommand.bind(commandValidator),
    validateInteraction: commandValidator.validateInteraction.bind(commandValidator),
    validateOptions: commandValidator.validateOptions.bind(commandValidator),
    validateCustomId: commandValidator.validateCustomId.bind(commandValidator),
    validateEmbed: commandValidator.validateEmbed.bind(commandValidator),
    getCacheStats: commandValidator.getCacheStats.bind(commandValidator),
    clearCache: commandValidator.clearCache.bind(commandValidator)
};
