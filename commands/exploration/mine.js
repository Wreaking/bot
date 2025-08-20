
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const MINING_LOCATIONS = {
    copper_mine: {
        name: '🟤 Copper Mine',
        description: 'A beginner-friendly mine with abundant copper deposits',
        level_required: 1,
        energy_cost: 10,
        rewards: {
            copper_ore: { chance: 70, amount: [1, 3] },
            iron_ore: { chance: 20, amount: [1, 2] },
            gems: { chance: 5, amount: [1, 1] },
            coins: { chance: 80, amount: [25, 75] }
        }
    },
    iron_mine: {
        name: '⚪ Iron Mine',
        description: 'Deeper tunnels yield better metals but require more skill',
        level_required: 5,
        energy_cost: 15,
        rewards: {
            iron_ore: { chance: 60, amount: [2, 4] },
            silver_ore: { chance: 30, amount: [1, 2] },
            precious_gems: { chance: 10, amount: [1, 1] },
            coins: { chance: 85, amount: [50, 150] }
        }
    },
    gold_mine: {
        name: '🟡 Gold Mine',
        description: 'Treacherous depths hide the most valuable treasures',
        level_required: 10,
        energy_cost: 25,
        rewards: {
            gold_ore: { chance: 40, amount: [1, 3] },
            platinum_ore: { chance: 15, amount: [1, 1] },
            rare_crystals: { chance: 8, amount: [1, 1] },
            ancient_artifact: { chance: 3, amount: [1, 1] },
            coins: { chance: 90, amount: [100, 300] }
        }
    },
    crystal_cavern: {
        name: '💎 Crystal Cavern',
        description: 'Mystical caves filled with magical crystals and dangers',
        level_required: 15,
        energy_cost: 30,
        rewards: {
            magic_crystal: { chance: 50, amount: [1, 2] },
            enchanted_gem: { chance: 25, amount: [1, 1] },
            dragon_scale: { chance: 5, amount: [1, 1] },
            legendary_ore: { chance: 2, amount: [1, 1] },
            coins: { chance: 95, amount: [200, 500] }
        }
    }
};

const MINING_TOOLS = {
    rusty_pickaxe: { name: '🔨 Rusty Pickaxe', efficiency: 1.0, durability: 100 },
    iron_pickaxe: { name: '⚒️ Iron Pickaxe', efficiency: 1.5, durability: 200 },
    steel_pickaxe: { name: '🛠️ Steel Pickaxe', efficiency: 2.0, durability: 300 },
    enchanted_pickaxe: { name: '✨ Enchanted Pickaxe', efficiency: 3.0, durability: 500 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('🏔️ Mine for valuable ores and precious gems')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose a mining location')
                .setRequired(false)
                .addChoices(
                    { name: '🟤 Copper Mine (Level 1+)', value: 'copper_mine' },
                    { name: '⚪ Iron Mine (Level 5+)', value: 'iron_mine' },
                    { name: '🟡 Gold Mine (Level 10+)', value: 'gold_mine' },
                    { name: '💎 Crystal Cavern (Level 15+)', value: 'crystal_cavern' }
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};
            
            // Initialize mining data
            if (!userData.mining) {
                userData.mining = {
                    level: 1,
                    experience: 0,
                    energy: 100,
                    tools: ['rusty_pickaxe'],
                    equipped_tool: 'rusty_pickaxe',
                    last_energy_regen: Date.now()
                };
            }

            // Regenerate energy over time
            this.regenerateEnergy(userData);
            
            const location = interaction.options.getString('location');
            
            if (!location) {
                await this.showMiningMenu(interaction, userData);
            } else {
                await this.startMining(interaction, userData, location);
            }
            
        } catch (error) {
            console.error('Mining command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while mining. Please try again.',
                ephemeral: true
            });
        }
    },

    async showMiningMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⛏️ Mining Operations Center')
            .setDescription('╔═══════════════════════════════════════╗\n║          **MINING HEADQUARTERS**           ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/⛏️.png')
            .addFields(
                {
                    name: '📊 **Mining Stats**',
                    value: `**Level:** ${userData.mining.level}\n**Experience:** ${userData.mining.experience}\n**Energy:** ${userData.mining.energy}/100 ⚡\n**Tool:** ${MINING_TOOLS[userData.mining.equipped_tool]?.name || 'None'}`,
                    inline: true
                },
                {
                    name: '🎯 **Today\'s Progress**',
                    value: `**Ores Mined:** ${userData.mining.daily_ores || 0}\n**Gems Found:** ${userData.mining.daily_gems || 0}\n**Coins Earned:** ${userData.mining.daily_coins || 0}💰`,
                    inline: true
                },
                {
                    name: '🏆 **Achievements**',
                    value: `**Lifetime Mines:** ${userData.mining.total_mines || 0}\n**Rare Finds:** ${userData.mining.rare_finds || 0}\n**Master Miner:** ${userData.mining.level >= 20 ? '✅' : '❌'}`,
                    inline: true
                }
            );

        // Add available locations
        let locationsText = '';
        Object.entries(MINING_LOCATIONS).forEach(([key, location]) => {
            const canAccess = userData.mining.level >= location.level_required;
            const status = canAccess ? '✅' : '🔒';
            locationsText += `${status} ${location.name} *(Level ${location.level_required}+)*\n`;
        });

        embed.addFields({
            name: '🗺️ **Available Locations**',
            value: locationsText,
            inline: false
        });

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('mining_location')
            .setPlaceholder('🎯 Select a mining location')
            .addOptions(
                Object.entries(MINING_LOCATIONS).map(([key, location]) => ({
                    label: location.name,
                    value: key,
                    description: `Level ${location.level_required}+ • Energy: ${location.energy_cost}`,
                    emoji: location.name.split(' ')[0]
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mining_tools')
                    .setLabel('Manage Tools')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('mining_stats')
                    .setLabel('Detailed Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('mining_shop')
                    .setLabel('Mining Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪')
            );

        const selectRow = new ActionRowBuilder().addComponents(locationSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async startMining(interaction, userData, locationKey) {
        const location = MINING_LOCATIONS[locationKey];
        
        if (!location) {
            await interaction.editReply({
                content: '❌ Invalid mining location selected.',
                ephemeral: true
            });
            return;
        }

        // Check requirements
        if (userData.mining.level < location.level_required) {
            await interaction.editReply({
                content: `❌ You need level ${location.level_required} to mine at ${location.name}. Current level: ${userData.mining.level}`,
                ephemeral: true
            });
            return;
        }

        if (userData.mining.energy < location.energy_cost) {
            await interaction.editReply({
                content: `❌ Not enough energy! You need ${location.energy_cost} energy but only have ${userData.mining.energy}.`,
                ephemeral: true
            });
            return;
        }

        // Perform mining
        const results = this.performMining(userData, location);
        
        // Update user data
        userData.mining.energy -= location.energy_cost;
        userData.mining.experience += results.experience;
        userData.mining.total_mines = (userData.mining.total_mines || 0) + 1;

        // Check for level up
        const newLevel = Math.floor(userData.mining.experience / 100) + 1;
        const leveledUp = newLevel > userData.mining.level;
        userData.mining.level = newLevel;

        // Save rewards to inventory
        for (const [item, amount] of Object.entries(results.rewards)) {
            if (!userData.inventory) userData.inventory = {};
            userData.inventory[item] = (userData.inventory[item] || 0) + amount;
        }

        userData.coins = (userData.coins || 0) + results.coins;
        await db.updateUser(interaction.user.id, userData);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(results.rare_find ? '#FFD700' : '#8B4513')
            .setTitle(`⛏️ Mining Results: ${location.name}`)
            .setDescription(results.rare_find ? 
                '🌟 **RARE FIND!** Your mining expedition yielded exceptional results!' :
                'Your mining expedition has concluded successfully!')
            .addFields(
                {
                    name: '💎 **Items Found**',
                    value: Object.entries(results.rewards).map(([item, amount]) => 
                        `${this.getItemEmoji(item)} ${item.replace(/_/g, ' ')}: ${amount}`
                    ).join('\n') || 'Nothing special this time...',
                    inline: true
                },
                {
                    name: '💰 **Rewards**',
                    value: `**Coins:** +${results.coins}\n**Experience:** +${results.experience}\n**Energy Used:** -${location.energy_cost}`,
                    inline: true
                }
            );

        if (leveledUp) {
            embed.addFields({
                name: '🎉 **LEVEL UP!**',
                value: `Congratulations! You reached **Level ${userData.mining.level}**!\n🔓 New locations and tools may be available!`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mine_again_${locationKey}`)
                    .setLabel('Mine Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⛏️')
                    .setDisabled(userData.mining.energy < location.energy_cost),
                new ButtonBuilder()
                    .setCustomId('mining_menu')
                    .setLabel('Mining Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('mining_inventory')
                    .setLabel('View Inventory')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎒')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    performMining(userData, location) {
        const tool = MINING_TOOLS[userData.mining.equipped_tool] || MINING_TOOLS.rusty_pickaxe;
        const efficiency = tool.efficiency;
        
        let rewards = {};
        let coins = 0;
        let experience = 15;
        let rare_find = false;

        // Roll for each possible reward
        for (const [item, config] of Object.entries(location.rewards)) {
            const chance = config.chance * efficiency;
            if (Math.random() * 100 < chance) {
                const amount = Math.floor(Math.random() * (config.amount[1] - config.amount[0] + 1)) + config.amount[0];
                
                if (item === 'coins') {
                    coins += Math.floor(amount * efficiency);
                } else {
                    rewards[item] = amount;
                    if (config.chance <= 10) {
                        rare_find = true;
                    }
                }
            }
        }

        // Bonus experience for rare finds
        if (rare_find) {
            experience += 25;
        }

        return {
            rewards,
            coins: Math.floor(coins),
            experience: Math.floor(experience * efficiency),
            rare_find
        };
    },

    regenerateEnergy(userData) {
        const now = Date.now();
        const timePassed = now - (userData.mining.last_energy_regen || now);
        const energyToRegen = Math.floor(timePassed / (5 * 60 * 1000)); // 1 energy per 5 minutes
        
        userData.mining.energy = Math.min(100, userData.mining.energy + energyToRegen);
        userData.mining.last_energy_regen = now;
    },

    getItemEmoji(item) {
        const emojiMap = {
            copper_ore: '🟤',
            iron_ore: '⚪',
            gold_ore: '🟡',
            silver_ore: '⚫',
            platinum_ore: '💍',
            gems: '💎',
            precious_gems: '💠',
            rare_crystals: '🔮',
            magic_crystal: '✨',
            enchanted_gem: '🌟',
            dragon_scale: '🐲',
            ancient_artifact: '🏺',
            legendary_ore: '⭐'
        };
        return emojiMap[item] || '📦';
    },

    async handleSelectMenu(interaction, value) {
        try {
            await interaction.deferUpdate();
            const userData = await db.getUserData(interaction.user.id) || {};
            
            if (value.startsWith('mining_location')) {
                const location = interaction.values[0];
                await this.startMining(interaction, userData, location);
            }
        } catch (error) {
            console.error('Mining select menu error:', error);
            await interaction.editReply({
                content: '❌ An error occurred processing your selection.',
                ephemeral: true
            });
        }
    }
};
