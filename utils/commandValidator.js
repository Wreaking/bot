const { Collection, ApplicationCommandOptionType, PermissionsBitField } = require('discord.js');

class CommandValidator {
    constructor(options = {}) {
        this.options = {
            // Validation settings
            requireTryCatch: options.requireTryCatch !== false,
            requireDescription: options.requireDescription !== false,
            maxDescriptionLength: options.maxDescriptionLength || 100,
            maxNameLength: options.maxNameLength || 32,
            allowedFileTypes: options.allowedFileTypes || ['js', 'ts'],
            strictValidation: options.strictValidation || false,
            ...options
        };

        // Cache for validation results
        this.validationCache = new Collection();
        
        // Application command option types mapping
        this.optionTypes = {
            1: 'SUB_COMMAND',
            2: 'SUB_COMMAND_GROUP', 
            3: 'STRING',
            4: 'INTEGER',
            5: 'BOOLEAN',
            6: 'USER',
            7: 'CHANNEL',
            8: 'ROLE',
            9: 'MENTIONABLE',
            10: 'NUMBER',
            11: 'ATTACHMENT'
        };

        // Permission validation cache
        this.permissionCache = new Collection();
    }

    /**
     * Validate command structure and requirements
     * @param {Object} command - The command module to validate
     * @param {string} filePath - Optional file path for better error reporting
     * @returns {Object} - Validation result with status and any errors
     */
    validateCommand(command, filePath = null) {
        const errors = [];
        const warnings = [];

        try {
            // Check basic command structure
            if (!command || typeof command !== 'object') {
                errors.push('Command must be a valid object');
                return { isValid: false, errors, warnings };
            }

            // Check for required properties
            if (!command.data) {
                errors.push('Missing command data object');
            } else {
                this.validateCommandData(command.data, errors, warnings);
            }

            if (!command.execute || typeof command.execute !== 'function') {
                errors.push('Missing or invalid execute function');
            } else {
                this.validateExecuteFunction(command.execute, errors, warnings);
            }

            // Check optional properties
            this.validateOptionalProperties(command, errors, warnings);

            // File-specific validation
            if (filePath) {
                this.validateFilePath(filePath, errors, warnings);
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                commandName: command.data?.name || 'Unknown'
            };

        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Validate command data object
     * @param {Object} data - Command data
     * @param {Array} errors - Errors array
     * @param {Array} warnings - Warnings array
     */
    validateCommandData(data, errors, warnings) {
        // Check name
        if (!data.name) {
            errors.push('Missing command name');
        } else {
            if (typeof data.name !== 'string') {
                errors.push('Command name must be a string');
            }
            if (data.name.length > this.options.maxNameLength) {
                errors.push(`Command name too long (max ${this.options.maxNameLength} characters)`);
            }
            if (!/^[a-z0-9_-]+$/.test(data.name)) {
                errors.push('Command name can only contain lowercase letters, numbers, hyphens, and underscores');
            }
        }

        // Check description
        if (!data.description && this.options.requireDescription) {
            errors.push('Missing command description');
        } else if (data.description) {
            if (typeof data.description !== 'string') {
                errors.push('Command description must be a string');
            }
            if (data.description.length > this.options.maxDescriptionLength) {
                errors.push(`Command description too long (max ${this.options.maxDescriptionLength} characters)`);
            }
            if (data.description.length < 1) {
                errors.push('Command description cannot be empty');
            }
        }

        // Check options if present
        if (data.options) {
            this.validateCommandOptions(data.options, errors, warnings);
        }

        // Check for deprecated properties
        if (data.defaultPermission !== undefined) {
            warnings.push('defaultPermission is deprecated, use default_member_permissions instead');
        }
    }

    /**
     * Validate command options
     * @param {Array} options - Command options array
     * @param {Array} errors - Errors array
     * @param {Array} warnings - Warnings array
     */
    validateCommandOptions(options, errors, warnings) {
        if (!Array.isArray(options)) {
            errors.push('Command options must be an array');
            return;
        }

        const optionNames = new Set();

        options.forEach((option, index) => {
            if (!option || typeof option !== 'object') {
                errors.push(`Option ${index} must be a valid object`);
                return;
            }

            // Check required properties
            if (!option.name) {
                errors.push(`Option ${index} is missing name`);
            } else {
                if (optionNames.has(option.name)) {
                    errors.push(`Duplicate option name: ${option.name}`);
                }
                optionNames.add(option.name);

                if (!/^[a-z0-9_-]+$/.test(option.name)) {
                    errors.push(`Option ${option.name} name can only contain lowercase letters, numbers, hyphens, and underscores`);
                }
            }

            if (!option.description) {
                errors.push(`Option ${option.name || index} is missing description`);
            }

            if (option.type === undefined) {
                errors.push(`Option ${option.name || index} is missing type`);
            } else if (!Object.values(ApplicationCommandOptionType).includes(option.type)) {
                errors.push(`Option ${option.name || index} has invalid type: ${option.type}`);
            }

            // Validate choices if present
            if (option.choices && !Array.isArray(option.choices)) {
                errors.push(`Option ${option.name || index} choices must be an array`);
            }

            // Validate min/max values for number types
            if ([ApplicationCommandOptionType.Integer, ApplicationCommandOptionType.Number].includes(option.type)) {
                if (option.min_value !== undefined && option.max_value !== undefined) {
                    if (option.min_value > option.max_value) {
                        errors.push(`Option ${option.name || index} min_value cannot be greater than max_value`);
                    }
                }
            }
        });
    }

    /**
     * Validate execute function
     * @param {Function} executeFunc - Execute function
     * @param {Array} errors - Errors array
     * @param {Array} warnings - Warnings array
     */
    validateExecuteFunction(executeFunc, errors, warnings) {
        const funcString = executeFunc.toString();

        // Check for error handling
        if (this.options.requireTryCatch) {
            if (!funcString.includes('try') || !funcString.includes('catch')) {
                if (this.options.strictValidation) {
                    errors.push('Execute function must include try-catch error handling');
                } else {
                    warnings.push('Execute function should include try-catch error handling');
                }
            }
        }

        // Check function parameters
        const paramMatch = funcString.match(/^(?:async\s+)?function[^(]*\(([^)]*)\)|^(?:async\s+)?\(([^)]*)\)\s*=>/);
        if (paramMatch) {
            const params = (paramMatch[1] || paramMatch[2] || '').split(',').map(p => p.trim()).filter(p => p);
            if (params.length === 0) {
                warnings.push('Execute function should accept interaction parameter');
            } else if (!params[0].includes('interaction')) {
                warnings.push('First parameter should be named "interaction"');
            }
        }

        // Check if function is async
        if (!funcString.startsWith('async')) {
            warnings.push('Execute function should be async for proper Discord interaction handling');
        }
    }

    /**
     * Validate optional command properties
     * @param {Object} command - Command object
     * @param {Array} errors - Errors array
     * @param {Array} warnings - Warnings array
     */
    validateOptionalProperties(command, errors, warnings) {
        // Check cooldown
        if (command.cooldown !== undefined) {
            if (typeof command.cooldown !== 'number' || command.cooldown < 0) {
                errors.push('Cooldown must be a positive number');
            }
        }

        // Check permissions
        if (command.permissions && !Array.isArray(command.permissions)) {
            errors.push('Permissions must be an array');
        }

        // Check category
        if (command.category && typeof command.category !== 'string') {
            warnings.push('Category should be a string');
        }

        // Check if command has proper module exports
        if (command.data && command.execute) {
            // This is likely a proper command structure
        } else if (command.name || command.description) {
            warnings.push('Command uses old structure, consider updating to slash command format');
        }
    }

    /**
     * Validate file path
     * @param {string} filePath - File path
     * @param {Array} errors - Errors array
     * @param {Array} warnings - Warnings array
     */
    validateFilePath(filePath, errors, warnings) {
        const extension = filePath.split('.').pop()?.toLowerCase();
        
        if (!this.options.allowedFileTypes.includes(extension)) {
            warnings.push(`Unexpected file extension: .${extension}`);
        }

        if (filePath.includes(' ')) {
            warnings.push('File path contains spaces, consider using underscores or hyphens');
        }
    }

    /**
     * Validate interaction requirements with enhanced checks
     * @param {Interaction} interaction - The Discord interaction
     * @param {Object} requirements - Command requirements
     * @returns {Object} - Validation result
     */
    validateInteraction(interaction, requirements = {}) {
        const results = {
            valid: true,
            errors: [],
            warnings: []
        };

        try {
            // Check if interaction exists and is valid
            if (!interaction) {
                results.valid = false;
                results.errors.push('Interaction is null or undefined');
                return results;
            }

            // Check if interaction is in a guild if required
            if (requirements.guildOnly && !interaction.inGuild()) {
                results.valid = false;
                results.errors.push('This command can only be used in a server');
            }

            // Check if user is in a voice channel if required
            if (requirements.voiceChannelRequired) {
                const member = interaction.member;
                if (!member?.voice?.channel) {
                    results.valid = false;
                    results.errors.push('You must be in a voice channel to use this command');
                }
            }

            // Check user permissions
            if (requirements.permissions && requirements.permissions.length > 0) {
                const missingPerms = this.checkUserPermissions(interaction, requirements.permissions);
                if (missingPerms.length > 0) {
                    results.valid = false;
                    results.errors.push(`You are missing required permissions: ${missingPerms.join(', ')}`);
                }
            }

            // Check bot permissions
            if (requirements.botPermissions && requirements.botPermissions.length > 0) {
                const missingPerms = this.checkBotPermissions(interaction, requirements.botPermissions);
                if (missingPerms.length > 0) {
                    results.valid = false;
                    results.errors.push(`I am missing required permissions: ${missingPerms.join(', ')}`);
                }
            }

            // Check channel type requirements
            if (requirements.channelTypes && requirements.channelTypes.length > 0) {
                if (!requirements.channelTypes.includes(interaction.channel?.type)) {
                    results.valid = false;
                    results.errors.push('This command cannot be used in this type of channel');
                }
            }

            // Check NSFW requirement
            if (requirements.nsfw && !interaction.channel?.nsfw) {
                results.valid = false;
                results.errors.push('This command can only be used in NSFW channels');
            }

            // Check if bot can send messages in the channel
            if (interaction.guild && interaction.channel) {
                const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
                const canSend = interaction.channel.permissionsFor(botMember)?.has([
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ViewChannel
                ]);
                
                if (!canSend) {
                    results.valid = false;
                    results.errors.push('I cannot send messages in this channel');
                }
            }

            return results;

        } catch (error) {
            results.valid = false;
            results.errors.push(`Validation error: ${error.message}`);
            return results;
        }
    }

    /**
     * Check user permissions
     * @param {Interaction} interaction - Discord interaction
     * @param {Array} requiredPermissions - Required permissions
     * @returns {Array} - Missing permissions
     */
    checkUserPermissions(interaction, requiredPermissions) {
        const missingPerms = [];
        
        if (!interaction.member || !interaction.member.permissions) {
            return requiredPermissions; // All permissions are missing
        }

        for (const permission of requiredPermissions) {
            const permFlag = typeof permission === 'string' 
                ? PermissionsBitField.Flags[permission]
                : permission;
                
            if (!interaction.member.permissions.has(permFlag)) {
                missingPerms.push(permission);
            }
        }

        return missingPerms;
    }

    /**
     * Check bot permissions
     * @param {Interaction} interaction - Discord interaction
     * @param {Array} requiredPermissions - Required permissions
     * @returns {Array} - Missing permissions
     */
    checkBotPermissions(interaction, requiredPermissions) {
        const missingPerms = [];
        
        if (!interaction.guild) {
            return []; // DM channels don't have permission restrictions
        }

        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        if (!botMember) {
            return requiredPermissions; // Bot not in guild
        }

        const botPermissions = interaction.channel 
            ? interaction.channel.permissionsFor(botMember)
            : botMember.permissions;

        if (!botPermissions) {
            return requiredPermissions;
        }

        for (const permission of requiredPermissions) {
            const permFlag = typeof permission === 'string' 
                ? PermissionsBitField.Flags[permission]
                : permission;
                
            if (!botPermissions.has(permFlag)) {
                missingPerms.push(permission);
            }
        }

        return missingPerms;
    }

    /**
     * Validate command options with enhanced type checking
     * @param {Object} command - The command module
     * @param {Interaction} interaction - The Discord interaction
     * @returns {Object} - Validation result with detailed errors
     */
    validateOptions(command, interaction) {
        const results = {
            valid: true,
            errors: []
        };

        if (!command.data?.options) {
            return results;
        }

        try {
            for (const option of command.data.options) {
                const value = interaction.options.get(option.name);
                
                // Check required options
                if (option.required && !value) {
                    results.valid = false;
                    results.errors.push(`Missing required option: ${option.name}`);
                    continue;
                }

                if (!value) continue; // Skip validation for optional missing values

                // Enhanced type validation
                const typeValidation = this.validateOptionType(option, value.value, value.type);
                if (!typeValidation.valid) {
                    results.valid = false;
                    results.errors.push(`Invalid ${option.name}: ${typeValidation.error}`);
                }

                // Validate choices
                if (option.choices && option.choices.length > 0) {
                    const validChoices = option.choices.map(choice => choice.value);
                    if (!validChoices.includes(value.value)) {
                        results.valid = false;
                        results.errors.push(`Invalid choice for ${option.name}. Valid options: ${validChoices.join(', ')}`);
                    }
                }

                // Validate min/max values for numbers
                if ([ApplicationCommandOptionType.Integer, ApplicationCommandOptionType.Number].includes(option.type)) {
                    if (option.min_value !== undefined && value.value < option.min_value) {
                        results.valid = false;
                        results.errors.push(`${option.name} must be at least ${option.min_value}`);
                    }
                    if (option.max_value !== undefined && value.value > option.max_value) {
                        results.valid = false;
                        results.errors.push(`${option.name} must be at most ${option.max_value}`);
                    }
                }

                // Validate string length
                if (option.type === ApplicationCommandOptionType.String) {
                    if (option.min_length !== undefined && value.value.length < option.min_length) {
                        results.valid = false;
                        results.errors.push(`${option.name} must be at least ${option.min_length} characters long`);
                    }
                    if (option.max_length !== undefined && value.value.length > option.max_length) {
                        results.valid = false;
                        results.errors.push(`${option.name} must be at most ${option.max_length} characters long`);
                    }
                }
            }

            return results;

        } catch (error) {
            results.valid = false;
            results.errors.push(`Option validation error: ${error.message}`);
            return results;
        }
    }

    /**
     * Validate option type
     * @param {Object} option - Option definition
     * @param {*} value - Option value
     * @param {number} receivedType - Received option type
     * @returns {Object} - Validation result
     */
    validateOptionType(option, value, receivedType) {
        // Check if received type matches expected type
        if (option.type !== receivedType) {
            return {
                valid: false,
                error: `Expected ${this.optionTypes[option.type]}, received ${this.optionTypes[receivedType]}`
            };
        }

        switch (option.type) {
            case ApplicationCommandOptionType.String:
                if (typeof value !== 'string') {
                    return { valid: false, error: 'Must be a string' };
                }
                break;
            
            case ApplicationCommandOptionType.Integer:
                if (!Number.isInteger(value)) {
                    return { valid: false, error: 'Must be an integer' };
                }
                break;
            
            case ApplicationCommandOptionType.Number:
                if (typeof value !== 'number' || isNaN(value)) {
                    return { valid: false, error: 'Must be a valid number' };
                }
                break;
            
            case ApplicationCommandOptionType.Boolean:
                if (typeof value !== 'boolean') {
                    return { valid: false, error: 'Must be true or false' };
                }
                break;
            
            // Discord handles User, Channel, Role validation automatically
            case ApplicationCommandOptionType.User:
            case ApplicationCommandOptionType.Channel:
            case ApplicationCommandOptionType.Role:
            case ApplicationCommandOptionType.Mentionable:
            case ApplicationCommandOptionType.Attachment:
                // These are validated by Discord
                break;
        }

        return { valid: true };
    }

    /**
     * Validate multiple commands at once
     * @param {Array} commands - Array of command objects
     * @returns {Object} - Validation summary
     */
    validateCommands(commands) {
        const results = {
            total: commands.length,
            valid: 0,
            invalid: 0,
            warnings: 0,
            details: []
        };

        commands.forEach((command, index) => {
            const validation = this.validateCommand(command, `command-${index}`);
            
            if (validation.isValid) {
                results.valid++;
            } else {
                results.invalid++;
            }
            
            if (validation.warnings?.length > 0) {
                results.warnings += validation.warnings.length;
            }

            results.details.push(validation);
        });

        return results;
    }

    /**
     * Get validation statistics
     * @returns {Object} - Statistics about validations performed
     */
    getStats() {
        return {
            cacheSize: this.validationCache.size,
            permissionCacheSize: this.permissionCache.size,
            options: this.options
        };
    }

    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache.clear();
        this.permissionCache.clear();
    }
}

// Export both class and singleton instance
const validator = new CommandValidator();

module.exports = {
    CommandValidator,
    validator,
    // For backward compatibility
    default: validator
};