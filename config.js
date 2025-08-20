// Load environment variables
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('Please create a .env file with the following variables:');
    console.log('DISCORD_BOT_TOKEN=your_bot_token_here');
    console.log('DISCORD_CLIENT_ID=your_client_id_here');
    process.exit(1);
}

module.exports = {
    // Discord Configuration
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    prefix: process.env.BOT_PREFIX || 'v!',
    
    // Game Configuration
    economy: {
        dailyReward: parseInt(process.env.DAILY_REWARD) || 500,
        workReward: { 
            min: parseInt(process.env.WORK_REWARD_MIN) || 100, 
            max: parseInt(process.env.WORK_REWARD_MAX) || 300 
        },
        itemPrices: {
            'Magic Compass': 1000,
            'Golden Shovel': 2500,
            'Treasure Map': 5000,
            'Ancient Key': 10000,
            'Dragon Scale': 15000,
            'Health Potion': 50,
            'Mana Potion': 75,
            'Strength Elixir': 200,
            'Lucky Charm': 500,
            'Mystic Scroll': 750
        }
    },
    
    // Clue System Configuration
    clueRewards: {
        easy: 100,
        medium: 250,
        hard: 500,
        expert: 1000,
        legendary: 2500
    },
    
    // Performance & Rate Limiting
    commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 3000, // 3 seconds
    huntCooldown: parseInt(process.env.HUNT_COOLDOWN) || 300000, // 5 minutes
    dailyCooldown: parseInt(process.env.DAILY_COOLDOWN) || 86400000, // 24 hours
    workCooldown: parseInt(process.env.WORK_COOLDOWN) || 3600000, // 1 hour
    battleCooldown: parseInt(process.env.BATTLE_COOLDOWN) || 600000, // 10 minutes
    
    // Database Configuration (if using a database)
    database: {
        type: process.env.DB_TYPE || 'json', // 'json', 'sqlite', 'mysql', 'postgres'
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        username: process.env.DB_USERNAME || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'treasure_hunt_bot',
        filename: process.env.DB_FILE || './data/database.json'
    },
    
    // UI/UX Configuration
    embedColors: {
        success: parseInt(process.env.COLOR_SUCCESS, 16) || 0x00FF00,
        error: parseInt(process.env.COLOR_ERROR, 16) || 0xFF0000,
        warning: parseInt(process.env.COLOR_WARNING, 16) || 0xFFA500,
        info: parseInt(process.env.COLOR_INFO, 16) || 0x5865F2,
        treasure: parseInt(process.env.COLOR_TREASURE, 16) || 0xFFD700,
        hunt: parseInt(process.env.COLOR_HUNT, 16) || 0xFF6347,
        economy: parseInt(process.env.COLOR_ECONOMY, 16) || 0x32CD32,
        profile: parseInt(process.env.COLOR_PROFILE, 16) || 0x9370DB,
        leaderboard: parseInt(process.env.COLOR_LEADERBOARD, 16) || 0xFF69B4,
        shop: parseInt(process.env.COLOR_SHOP, 16) || 0x00CED1,
        inventory: parseInt(process.env.COLOR_INVENTORY, 16) || 0xDDA0DD,
        battle: parseInt(process.env.COLOR_BATTLE, 16) || 0xDC143C,
        magic: parseInt(process.env.COLOR_MAGIC, 16) || 0x8A2BE2
    },
    
    // Game Features (can be toggled via environment variables)
    features: {
        economy: (process.env.FEATURE_ECONOMY !== 'false'),
        leaderboards: (process.env.FEATURE_LEADERBOARDS !== 'false'),
        achievements: (process.env.FEATURE_ACHIEVEMENTS !== 'false'),
        inventory: (process.env.FEATURE_INVENTORY !== 'false'),
        shop: (process.env.FEATURE_SHOP !== 'false'),
        hints: (process.env.FEATURE_HINTS !== 'false'),
        multiplayer: (process.env.FEATURE_MULTIPLAYER !== 'false'),
        battles: (process.env.FEATURE_BATTLES !== 'false'),
        guilds: (process.env.FEATURE_GUILDS !== 'false'),
        trading: (process.env.FEATURE_TRADING !== 'false'),
        crafting: (process.env.FEATURE_CRAFTING !== 'false'),
        housing: (process.env.FEATURE_HOUSING !== 'false')
    },
    
    // Bot Metadata
    version: process.env.BOT_VERSION || '3.0.1',
    description: process.env.BOT_DESCRIPTION || 'Advanced Discord Treasure Hunt & RPG Gaming Bot',
    author: process.env.BOT_AUTHOR || 'Enhanced Gaming Bot',
    support_server: process.env.SUPPORT_SERVER || '',
    website: process.env.BOT_WEBSITE || '',
    
    // Game Emojis (can be customized via environment variables)
    emojis: {
        coin: process.env.EMOJI_COIN || '🪙',
        treasure: process.env.EMOJI_TREASURE || '💰',
        map: process.env.EMOJI_MAP || '🗺️',
        compass: process.env.EMOJI_COMPASS || '🧭',
        key: process.env.EMOJI_KEY || '🗝️',
        shovel: process.env.EMOJI_SHOVEL || '🪃',
        gem: process.env.EMOJI_GEM || '💎',
        crown: process.env.EMOJI_CROWN || '👑',
        star: process.env.EMOJI_STAR || '⭐',
        fire: process.env.EMOJI_FIRE || '🔥',
        lightning: process.env.EMOJI_LIGHTNING || '⚡',
        magic: process.env.EMOJI_MAGIC || '✨',
        dragon: process.env.EMOJI_DRAGON || '🐉',
        skull: process.env.EMOJI_SKULL || '💀',
        shield: process.env.EMOJI_SHIELD || '🛡️',
        sword: process.env.EMOJI_SWORD || '⚔️',
        heart: process.env.EMOJI_HEART || '❤️',
        mana: process.env.EMOJI_MANA || '💙',
        exp: process.env.EMOJI_EXP || '🌟',
        level: process.env.EMOJI_LEVEL || '🎯'
    },
    
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info', // 'error', 'warn', 'info', 'debug'
        file: process.env.LOG_FILE || './logs/bot.log',
        console: (process.env.LOG_CONSOLE !== 'false'),
        timestamp: (process.env.LOG_TIMESTAMP !== 'false')
    },
    
    // Game Balance Configuration
    gameBalance: {
        maxLevel: parseInt(process.env.MAX_LEVEL) || 100,
        expPerLevel: parseInt(process.env.EXP_PER_LEVEL) || 1000,
        maxHealth: parseInt(process.env.MAX_HEALTH) || 100,
        maxMana: parseInt(process.env.MAX_MANA) || 100,
        startingGold: parseInt(process.env.STARTING_GOLD) || 1000,
        startingItems: [
            'Wooden Sword',
            'Leather Armor',
            'Basic Health Potion'
        ]
    },
    
    // Hunt Configuration
    huntSettings: {
        maxAttempts: parseInt(process.env.HUNT_MAX_ATTEMPTS) || 3,
        baseSuccessRate: parseFloat(process.env.HUNT_SUCCESS_RATE) || 0.7,
        difficultyMultiplier: {
            easy: 1.0,
            medium: 0.8,
            hard: 0.6,
            expert: 0.4,
            legendary: 0.2
        },
        rewardMultiplier: {
            easy: 1.0,
            medium: 1.5,
            hard: 2.0,
            expert: 3.0,
            legendary: 5.0
        }
    },
    
    // Battle System Configuration
    battleSettings: {
        maxTurns: parseInt(process.env.BATTLE_MAX_TURNS) || 20,
        criticalHitChance: parseFloat(process.env.BATTLE_CRIT_CHANCE) || 0.1,
        criticalHitMultiplier: parseFloat(process.env.BATTLE_CRIT_MULTIPLIER) || 2.0,
        escapeChance: parseFloat(process.env.BATTLE_ESCAPE_CHANCE) || 0.3,
        expRewardMultiplier: parseFloat(process.env.BATTLE_EXP_MULTIPLIER) || 1.2
    },
    
    // Shop Configuration
    shopSettings: {
        dailyItemRotation: (process.env.SHOP_DAILY_ROTATION !== 'false'),
        discountChance: parseFloat(process.env.SHOP_DISCOUNT_CHANCE) || 0.1,
        maxDiscountPercent: parseInt(process.env.SHOP_MAX_DISCOUNT) || 25,
        specialItemChance: parseFloat(process.env.SHOP_SPECIAL_CHANCE) || 0.05
    },
    
    // Achievement Configuration
    achievements: {
        huntMilestones: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
        goldMilestones: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
        levelMilestones: [5, 10, 25, 50, 75, 100],
        battleMilestones: [1, 10, 25, 50, 100, 250, 500]
    },
    
    // Security Configuration
    security: {
        maxCommandsPerMinute: parseInt(process.env.MAX_COMMANDS_PER_MINUTE) || 20,
        enableRateLimiting: (process.env.ENABLE_RATE_LIMITING !== 'false'),
        adminUsers: process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',') : [],
        moderatorRoles: process.env.MODERATOR_ROLES ? process.env.MODERATOR_ROLES.split(',') : [],
        enableMaintenanceMode: (process.env.MAINTENANCE_MODE === 'true')
    },
    
    // Error Handling Configuration
    errorHandling: {
        enableDetailedErrors: (process.env.DETAILED_ERRORS === 'true'),
        errorReportingChannel: process.env.ERROR_CHANNEL || '',
        enableAutoRestart: (process.env.AUTO_RESTART !== 'false'),
        maxRestartAttempts: parseInt(process.env.MAX_RESTART_ATTEMPTS) || 3
    },
    
    // Performance Configuration
    performance: {
        cacheTimeout: parseInt(process.env.CACHE_TIMEOUT) || 300000, // 5 minutes
        maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || 1000,
        enableCompression: (process.env.ENABLE_COMPRESSION !== 'false'),
        maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB) || 512
    },
    
    // Localization Configuration
    localization: {
        defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
        enableTranslation: (process.env.ENABLE_TRANSLATION === 'true'),
        supportedLanguages: process.env.SUPPORTED_LANGUAGES ? process.env.SUPPORTED_LANGUAGES.split(',') : ['en']
    },
    
    // Development Configuration
    development: {
        debugMode: (process.env.DEBUG_MODE === 'true'),
        enableTestCommands: (process.env.ENABLE_TEST_COMMANDS === 'true'),
        testGuildId: process.env.TEST_GUILD_ID || '',
        enableHotReload: (process.env.ENABLE_HOT_RELOAD === 'true')
    },
    
    // Validation function to check configuration
    validate() {
        const errors = [];
        
        // Check required fields
        if (!this.token) errors.push('DISCORD_BOT_TOKEN is required');
        if (!this.clientId) errors.push('DISCORD_CLIENT_ID is required');
        
        // Check numeric values
        if (this.commandCooldown < 0) errors.push('COMMAND_COOLDOWN must be positive');
        if (this.huntCooldown < 0) errors.push('HUNT_COOLDOWN must be positive');
        
        // Check color values
        Object.entries(this.embedColors).forEach(([key, value]) => {
            if (typeof value !== 'number' || value < 0 || value > 0xFFFFFF) {
                errors.push(`Invalid color value for ${key}: ${value}`);
            }
        });
        
        // Check percentages
        if (this.huntSettings.baseSuccessRate < 0 || this.huntSettings.baseSuccessRate > 1) {
            errors.push('HUNT_SUCCESS_RATE must be between 0 and 1');
        }
        
        if (errors.length > 0) {
            console.error('❌ Configuration validation failed:');
            errors.forEach(error => console.error(`   - ${error}`));
            return false;
        }
        
        return true;
    },
    
    // Helper function to get feature status
    isFeatureEnabled(featureName) {
        return this.features[featureName] === true;
    },
    
    // Helper function to get embed color
    getEmbedColor(type) {
        return this.embedColors[type] || this.embedColors.info;
    },
    
    // Helper function to get emoji
    getEmoji(type) {
        return this.emojis[type] || '❓';
    }
};