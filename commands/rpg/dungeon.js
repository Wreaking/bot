const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const dungeons = [
    {
        id: 'goblin_cave',
        name: 'Goblin Cave',
        difficulty: 'easy',
        requiredLevel: 1,
        floors: 3,
        monsters: ['Goblin Scout', 'Cave Rat', 'Goblin Warrior'],
        rewards: { coins: 200, experience: 100, items: ['Iron Dagger', 'Leather Boots'] },
        emoji: '🕳️'
    },
    {
        id: 'haunted_forest',
        name: 'Haunted Forest',
        difficulty: 'medium',
        requiredLevel: 5,
        floors: 5,
        monsters: ['Shadow Beast', 'Cursed Tree', 'Forest Wraith', 'Dark Elf'],
        rewards: { coins: 500, experience: 250, items: ['Shadow Cloak', 'Mystic Staff'] },
        emoji: '🌲'
    },
    {
        id: 'crystal_caverns',
        name: 'Crystal Caverns',
        difficulty: 'hard',
        requiredLevel: 10,
        floors: 7,
        monsters: ['Crystal Golem', 'Gem Spider', 'Cave Troll', 'Crystal Guardian'],
        rewards: { coins: 1000, experience: 500, items: ['Crystal Sword', 'Diamond Shield'] },
        emoji: '💎'
    },
    {
        id: 'dragon_lair',
        name: 'Ancient Dragon Lair',
        difficulty: 'nightmare',
        requiredLevel: 20,
        floors: 10,
        monsters: ['Dragon Hatchling', 'Fire Elemental', 'Dragon Knight', 'Ancient Dragon'],
        rewards: { coins: 2500, experience: 1000, items: ['Dragon Scale Armor', 'Dragonslayer Sword'] },
        emoji: '🐉'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('🏰 Explore dangerous dungeons for epic rewards!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your dungeon action')
                .setRequired(false)
                .addChoices(
                    { name: '🗺️ Explore Dungeon', value: 'explore' },
                    { name: '📋 View Available Dungeons', value: 'list' },
                    { name: '🏆 Dungeon Statistics', value: 'stats' },
                    { name: '🎒 Prepare for Expedition', value: 'prepare' }
                ))
        .addStringOption(option =>
            option.setName('dungeon')
                .setDescription('Select specific dungeon to explore')
                .setRequired(false)
                .addChoices(
                    { name: '🕳️ Goblin Cave (Easy)', value: 'goblin_cave' },
                    { name: '🌲 Haunted Forest (Medium)', value: 'haunted_forest' },
                    { name: '💎 Crystal Caverns (Hard)', value: 'crystal_caverns' },
                    { name: '🐉 Dragon Lair (Nightmare)', value: 'dragon_lair' }
                )),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'list';
        const dungeonId = interaction.options?.getString('dungeon');
        const userId = interaction.user.id;
        
        switch (action) {
            case 'explore':
                await this.exploreDungeon(interaction, dungeonId);
                break;
            case 'stats':
                await this.showStats(interaction);
                break;
            case 'prepare':
                await this.prepareDungeon(interaction);
                break;
            default:
                await this.listDungeons(interaction);
        }
    },
    
    async listDungeons(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || { stats: { level: 1 } };
        const userLevel = userData.stats?.level || 1;
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('🏰 Dungeon Explorer Hub')
            .setDescription('**Choose your next adventure!** Explore dangerous dungeons to earn coins, experience, and rare items.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '🎮 Your Explorer Status',
                    value: `⭐ Level: **${userLevel}**\n🏆 Dungeons Cleared: **${userData.stats?.dungeonClears || 0}**\n💰 Coins: **${userData.inventory?.coins || 0}**`,
                    inline: true
                },
                {
                    name: '🗺️ Expedition Tips',
                    value: '• Higher level dungeons = better rewards\n• Equip good gear before exploring\n• Use potions for tough battles\n• Team up with friends for bonus rewards',
                    inline: true
                },
                {
                    name: '🏅 Dungeon Mastery',
                    value: `🥉 Novice: ${userData.stats?.dungeonClears >= 5 ? '✅' : '❌'}\n🥈 Expert: ${userData.stats?.dungeonClears >= 15 ? '✅' : '❌'}\n🥇 Master: ${userData.stats?.dungeonClears >= 50 ? '✅' : '❌'}`,
                    inline: true
                }
            ]);
            
        // Add dungeon details
        dungeons.forEach(dungeon => {
            const canEnter = userLevel >= dungeon.requiredLevel;
            const statusIcon = canEnter ? '✅' : '🔒';
            const difficultyColor = this.getDifficultyColor(dungeon.difficulty);
            
            embed.addFields([{
                name: `${dungeon.emoji} ${dungeon.name} ${statusIcon}`,
                value: `**${dungeon.difficulty.toUpperCase()}** • Level ${dungeon.requiredLevel}+ Required\n` +
                       `🏢 ${dungeon.floors} floors • 💰 ${dungeon.rewards.coins} coins\n` +
                       `🎯 ${dungeon.rewards.experience} XP • 🎁 Rare Items\n` +
                       `👹 Monsters: ${dungeon.monsters.slice(0, 2).join(', ')}...`,
                inline: true
            }]);
        });
        
        const dungeonSelect = new StringSelectMenuBuilder()
            .setCustomId('dungeon_explore_select')
            .setPlaceholder('🗺️ Select a dungeon to explore...')
            .addOptions(
                dungeons.map(dungeon => {
                    const canEnter = userLevel >= dungeon.requiredLevel;
                    return {
                        label: `${dungeon.name} (${dungeon.difficulty})`,
                        description: `Level ${dungeon.requiredLevel}+ • ${dungeon.floors} floors • ${dungeon.rewards.coins} coins`,
                        value: `explore_${dungeon.id}`,
                        emoji: dungeon.emoji,
                        disabled: !canEnter
                    };
                })
            );
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_prepare')
                    .setLabel('🎒 Prepare Expedition')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dungeon_stats')
                    .setLabel('📊 My Statistics')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_party')
                    .setLabel('👥 Form Party')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_potions')
                    .setLabel('🧪 Buy Potions')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(dungeonSelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async exploreDungeon(interaction, dungeonId) {
        const userId = interaction.user.id;
        
        // Check if user is already in a dungeon
        if (interaction.client.activeDungeons?.has(userId)) {
            return interaction.reply({
                content: '🏰 You are already exploring a dungeon! Complete it first.',
                ephemeral: true
            });
        }
        
        if (!dungeonId) {
            return interaction.reply({
                content: '❌ Please select a dungeon to explore!',
                ephemeral: true
            });
        }
        
        const dungeon = dungeons.find(d => d.id === dungeonId);
        if (!dungeon) {
            return interaction.reply({
                content: '❌ Dungeon not found!',
                ephemeral: true
            });
        }
        
        const userData = await db.getUser(userId) || { stats: { level: 1 } };
        const userLevel = userData.stats?.level || 1;
        
        if (userLevel < dungeon.requiredLevel) {
            return interaction.reply({
                content: `❌ You need to be level ${dungeon.requiredLevel} to enter ${dungeon.name}! You are currently level ${userLevel}.`,
                ephemeral: true
            });
        }
        
        // Initialize dungeon exploration
        if (!interaction.client.activeDungeons) {
            interaction.client.activeDungeons = new Map();
        }
        
        const dungeonState = {
            dungeon: dungeon,
            currentFloor: 1,
            hp: userData.stats?.hp || 100,
            maxHp: userData.stats?.hp || 100,
            inventoryUsed: [],
            startTime: Date.now(),
            rewards: { coins: 0, experience: 0, items: [] }
        };
        
        interaction.client.activeDungeons.set(userId, dungeonState);
        
        const embed = new EmbedBuilder()
            .setColor(this.getDifficultyColor(dungeon.difficulty))
            .setTitle(`${dungeon.emoji} Entering ${dungeon.name}`)
            .setDescription(`**You step into the ${dungeon.name.toLowerCase()}...**\n\nThe air grows cold and you hear strange sounds echoing from the depths.`)
            .addFields([
                { name: '🎯 Expedition Details', value: `**Difficulty:** ${dungeon.difficulty.toUpperCase()}\n**Floors:** ${dungeon.floors}\n**Current Floor:** 1`, inline: true },
                { name: '❤️ Your Status', value: `**HP:** ${dungeonState.hp}/${dungeonState.maxHp}\n**Level:** ${userLevel}\n**Potions:** ${userData.inventory?.items?.filter(i => i.category === 'potions').length || 0}`, inline: true },
                { name: '🎁 Potential Rewards', value: `💰 Up to **${dungeon.rewards.coins}** coins\n🎯 Up to **${dungeon.rewards.experience}** XP\n🎁 Rare equipment and items`, inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Choose your next action carefully!' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_proceed')
                    .setLabel('🚶 Proceed Forward')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dungeon_search')
                    .setLabel('🔍 Search for Secrets')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_rest')
                    .setLabel('😴 Rest (Restore HP)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dungeon_retreat')
                    .setLabel('🏃 Retreat')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
        
        // Set timeout for dungeon exploration
        setTimeout(() => {
            if (interaction.client.activeDungeons?.has(userId)) {
                interaction.client.activeDungeons.delete(userId);
                interaction.followUp({
                    content: '⏰ Your dungeon expedition has timed out! You retreat to safety.',
                    ephemeral: true
                });
            }
        }, 900000); // 15 minutes
    },
    
    async showStats(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || { stats: {} };
        
        const stats = userData.stats || {};
        const dungeonStats = stats.dungeonStats || {
            totalEntered: 0,
            totalCleared: 0,
            totalDeaths: 0,
            favoriteFloor: 1,
            longestExpedition: 0,
            rarestItemFound: 'None'
        };
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`🏰 ${interaction.user.displayName}'s Dungeon Statistics`)
            .setDescription('**Your dungeon exploration achievements and records**')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '📊 Exploration Stats',
                    value: `🏰 Dungeons Entered: **${dungeonStats.totalEntered}**\n✅ Successfully Cleared: **${dungeonStats.totalCleared}**\n💀 Deaths: **${dungeonStats.totalDeaths}**`,
                    inline: true
                },
                {
                    name: '🏆 Records & Achievements',
                    value: `🏢 Deepest Floor: **${dungeonStats.deepestFloor || 1}**\n⏰ Longest Expedition: **${dungeonStats.longestExpedition}** min\n🎁 Rarest Item: **${dungeonStats.rarestItemFound}**`,
                    inline: true
                },
                {
                    name: '💎 Dungeon Mastery',
                    value: `🕳️ Goblin Cave: **${dungeonStats.goblinCaveClears || 0}**\n🌲 Haunted Forest: **${dungeonStats.hauntedForestClears || 0}**\n💎 Crystal Caverns: **${dungeonStats.crystalCavernClears || 0}**\n🐉 Dragon Lair: **${dungeonStats.dragonLairClears || 0}**`,
                    inline: false
                }
            ])
            .setFooter({ text: 'Keep exploring to improve your statistics!' })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    },
    
    async prepareDungeon(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || { inventory: { items: [] } };
        
        const potions = userData.inventory.items?.filter(item => item.category === 'potions') || [];
        const weapons = userData.inventory.items?.filter(item => item.category === 'weapons') || [];
        const armor = userData.inventory.items?.filter(item => item.category === 'armor') || [];
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('🎒 Dungeon Expedition Preparation')
            .setDescription('**Prepare yourself for the dangers ahead!**\nCheck your equipment and supplies before entering.')
            .addFields([
                {
                    name: '⚔️ Combat Readiness',
                    value: `🗡️ Weapons: **${weapons.length}**\n🛡️ Armor: **${armor.length}**\n⚡ Equipment Power: **${this.calculatePower(userData)}**`,
                    inline: true
                },
                {
                    name: '🧪 Supplies & Potions',
                    value: `❤️ Health Potions: **${potions.filter(p => p.id === 'health').length}**\n💙 Mana Potions: **${potions.filter(p => p.id === 'mana').length}**\n🍀 Luck Potions: **${potions.filter(p => p.id === 'luck').length}**`,
                    inline: true
                },
                {
                    name: '📋 Preparation Tips',
                    value: '• Equip your best gear\n• Stock up on health potions\n• Consider your level vs dungeon difficulty\n• Form a party for harder dungeons',
                    inline: false
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_equip')
                    .setLabel('⚡ Manage Equipment')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shop_potions')
                    .setLabel('🧪 Buy Potions')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dungeon_list')
                    .setLabel('🗺️ Select Dungeon')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    getDifficultyColor(difficulty) {
        const colors = {
            easy: 0x00FF00,
            medium: 0xFFFF00,
            hard: 0xFF6600,
            nightmare: 0xFF0000
        };
        return colors[difficulty] || 0x808080;
    },
    
    calculatePower(userData) {
        let power = (userData.stats?.level || 1) * 10;
        if (userData.equipment?.weapon) power += 20;
        if (userData.equipment?.armor) power += 15;
        if (userData.equipment?.accessory) power += 10;
        return power;
    }
};