const fs = require('fs');
const path = require('path');

class CommandLoader {
    constructor(client) {
        this.client = client;
        this.loadedCommands = new Map();
        this.failedCommands = new Map();
        this.categories = new Map();
    }

    /**
     * Load all commands from the commands directory
     * @param {string} commandsPath - Path to commands directory
     * @returns {Object} - Loading statistics
     */
    async loadAllCommands(commandsPath) {
        console.log('🔄 Starting enhanced command loading process...');

        if (!fs.existsSync(commandsPath)) {
            console.error(`❌ Commands directory not found: ${commandsPath}`);
            return { loaded: 0, failed: 0, categories: 0 };
        }

        const stats = await this.loadCommandsRecursive(commandsPath);

        console.log('\n📊 Enhanced Command Loading Complete:');
        console.log(`   ✅ Successfully loaded: ${stats.loaded} commands`);
        console.log(`   ❌ Failed to load: ${stats.failed} commands`);
        console.log(`   📂 Categories: ${stats.categories} categories`);

        // Show failed commands for debugging
        if (stats.failed > 0) {
            console.log('\n❌ Failed Commands Details:');
            this.failedCommands.forEach((reason, filePath) => {
                console.log(`   • ${path.basename(filePath)}: ${reason}`);
            });
        }

        return stats;
    }

    /**
     * Recursively load commands from directory structure
     * @param {string} dir - Directory to scan
     * @param {string} category - Current category
     * @returns {Object} - Loading statistics
     */
    async loadCommandsRecursive(dir, category = null) {
        let loaded = 0;
        let failed = 0;
        let categories = 0;

        const items = fs.readdirSync(dir, { withFileTypes: true });

        // Determine category from directory structure
        if (!category) {
            category = path.basename(dir);
            if (category === 'commands') {
                category = 'general';
            }
        }

        // Initialize category tracking
        if (!this.categories.has(category)) {
            this.categories.set(category, {
                loaded: 0,
                failed: 0,
                commands: []
            });
            categories = 1;
        }

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                // Recursively load subdirectories
                const subCategory = item.name;
                const subStats = await this.loadCommandsRecursive(fullPath, subCategory);
                loaded += subStats.loaded;
                failed += subStats.failed;
                categories += subStats.categories;
            } else if (item.name.endsWith('.js')) {
                try {
                    const result = await this.loadSingleCommand(fullPath, category);
                    if (result.success) {
                        loaded++;
                        this.categories.get(category).loaded++;
                        this.categories.get(category).commands.push(result.commandName);
                    } else {
                        failed++;
                        this.categories.get(category).failed++;
                    }
                } catch (error) {
                    console.error(`❌ Critical error loading ${fullPath}:`, error.message);
                    failed++;
                    this.categories.get(category).failed++;
                    this.failedCommands.set(fullPath, error.message);
                }
            }
        }

        return { loaded, failed, categories };
    }

    /**
     * Load a single command file with enhanced error handling
     * @param {string} filePath - Path to command file
     * @param {string} category - Command category
     * @returns {Object} - Loading result
     */
    async loadSingleCommand(filePath, category) {
        try {
            // Clear require cache to avoid stale modules
            delete require.cache[require.resolve(filePath)];

            // Try to require the command
            let command;
            try {
                command = require(filePath);
            } catch (requireError) {
                // Handle specific syntax errors
                if (requireError.message.includes('await is only valid in async functions')) {
                    this.failedCommands.set(filePath, 'Syntax error: improper async/await usage');
                    return { success: false, reason: 'Syntax error: improper async/await usage' };
                }
                throw requireError;
            }

            // Validate command structure
            const validation = this.validateCommand(command, filePath);
            if (!validation.valid) {
                console.warn(`⚠️ Skipped ${path.basename(filePath)}: ${validation.reason}`);
                this.failedCommands.set(filePath, validation.reason);
                return { success: false, reason: validation.reason };
            }

            // Check for duplicate command names
            if (this.client.commands.has(command.data.name)) {
                const duplicateReason = `Duplicate command name: ${command.data.name}`;
                console.warn(`⚠️ Skipped ${path.basename(filePath)}: ${duplicateReason}`);
                this.failedCommands.set(filePath, duplicateReason);
                return { success: false, reason: duplicateReason };
            }

            // Register command
            this.client.commands.set(command.data.name, command);
            this.client.prefixCommands.set(command.data.name, command);

            this.loadedCommands.set(command.data.name, {
                path: filePath,
                category: category,
                command: command
            });

            console.log(`   ✅ ${command.data.name} (${category})`);
            return { 
                success: true, 
                commandName: command.data.name,
                category: category 
            };

        } catch (error) {
            console.error(`   ❌ ${path.basename(filePath)}: ${error.message}`);
            this.failedCommands.set(filePath, error.message);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Enhanced command validation
     * @param {Object} command - Command object
     * @param {string} filePath - File path for logging
     * @returns {Object} - Validation result
     */
    validateCommand(command, filePath) {
        if (!command || typeof command !== 'object') {
            return { valid: false, reason: 'Invalid command export - not an object' };
        }

        if (!command.data) {
            return { valid: false, reason: 'Missing command.data property' };
        }

        if (!command.execute || typeof command.execute !== 'function') {
            return { valid: false, reason: 'Missing or invalid execute function' };
        }

        // Check for direct name/description properties
        if (command.data.name && command.data.description) {
            return { valid: true };
        }

        // Check for SlashCommandBuilder methods
        try {
            if (typeof command.data.toJSON === 'function') {
                // Test serialization
                const serialized = command.data.toJSON();
                if (serialized.name && serialized.description) {
                    return { valid: true };
                } else {
                    return { valid: false, reason: 'Command data serialization missing name or description' };
                }
            } else {
                return { valid: false, reason: 'Command data missing name/description and not a SlashCommandBuilder instance' };
            }
        } catch (error) {
            return { valid: false, reason: `Command data structure invalid: ${error.message}` };
        }
    }

    /**
     * Get loading statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        return {
            totalLoaded: this.loadedCommands.size,
            totalFailed: this.failedCommands.size,
            categories: Array.from(this.categories.keys()),
            categoryStats: Object.fromEntries(this.categories),
            failedCommands: Array.from(this.failedCommands.entries())
        };
    }

    /**
     * Get failed commands for debugging
     * @returns {Array} - Failed commands
     */
    getFailedCommands() {
        return Array.from(this.failedCommands.entries()).map(([path, reason]) => ({
            path: path,
            reason: reason,
            filename: path.basename(path)
        }));
    }

    /**
     * Reload a specific command
     * @param {string} commandName - Name of command to reload
     * @returns {boolean} - Success status
     */
    async reloadCommand(commandName) {
        const commandInfo = this.loadedCommands.get(commandName);
        if (!commandInfo) {
            return false;
        }

        try {
            const result = await this.loadSingleCommand(commandInfo.path, commandInfo.category);
            return result.success;
        } catch (error) {
            console.error(`Failed to reload command ${commandName}:`, error.message);
            return false;
        }
    }

    /**
     * Attempt to fix common issues automatically
     * @param {string} filePath - Path to the problematic file
     * @returns {boolean} - Whether fixes were applied
     */
    async attemptAutoFix(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let fixedContent = content;
            let wasFixed = false;

            // Fix common async/await issues
            if (content.includes('await ') && !content.includes('async ')) {
                // Try to identify the problematic function
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('await ') && lines[i].includes('function') && !lines[i].includes('async')) {
                        lines[i] = lines[i].replace('function', 'async function');
                        wasFixed = true;
                    }
                    if (lines[i].includes('await ') && lines[i].includes('=>') && !lines[i].includes('async')) {
                        lines[i] = lines[i].replace('=>', 'async =>');
                        wasFixed = true;
                    }
                }
                if (wasFixed) {
                    fixedContent = lines.join('\n');
                }
            }

            if (wasFixed) {
                fs.writeFileSync(filePath + '.backup', content); // Create backup
                fs.writeFileSync(filePath, fixedContent);
                console.log(`🔧 Auto-fixed: ${path.basename(filePath)}`);
                return true;
            }

        } catch (error) {
            console.error(`Failed to auto-fix ${filePath}:`, error.message);
        }

        return false;
    }
}

module.exports = CommandLoader;