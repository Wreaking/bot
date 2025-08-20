
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Enhanced raid dungeons configuration
const raidDungeons = {
    cursed_castle: {
        id: 'cursed_castle',
        name: 'Cursed Shadow Castle',
        emoji: '🏰',
        minLevel: 15,
        maxLevel: 25,
        minPartySize: 3,
        maxPartySize: 8,
        duration: 90, // minutes
        rewards: {
            coins: [2000, 5000],
            experience: [1500, 3500],
            items: ['Royal Crown', 'Ancient Sword', 'Castle Shield', 'Noble Armor'],
            rareItems: ['Cursed Throne', 'Shadow Crown', 'Spectral Blade']
        },
        boss: {
            name: 'Undead King Malachar',
            health: 8000,
            abilities: ['Soul Drain', 'Army of Undead', 'Curse of Despair'],
            phases: 3
        },
        difficulty: 4,
        mechanics: ['Curse Stacks', 'Minion Waves', 'Environmental Hazards'],
        description: 'A once-glorious castle now shrouded in darkness and ruled by an undead monarch.'
    },
    volcanic_forge: {
        name: 'Infernal Volcanic Forge',
        emoji: '🌋',
        minLevel: 20,
        maxLevel: 35,
        minPartySize: 4,
        maxPartySize: 10,
        duration: 120,
        rewards: {
            coins: [3500, 8000],
            experience: [2500, 5500],
            items: ['Dragon Scale', 'Fire Sword', 'Molten Helm', 'Flame Crystal'],
            rareItems: ['Dragonforge Hammer', 'Infernal Crown', 'Phoenix Feather']
        },
        boss: {
            name: 'Elder Fire Dragon Pyraxis',
            health: 15000,
            abilities: ['Molten Breath', 'Lava Geyser', 'Flame Tornado'],
            phases: 4
        },
        difficulty: 6,
        mechanics: ['Heat Zones', 'Lava Flows', 'Fire Immunity Required'],
        description: 'An ancient forge within a volcanic crater, guarded by the mightiest fire dragon.'
    },
    lost_temple: {
        name: 'Temple of Forgotten Gods',
        emoji: '🗿',
        minLevel: 10,
        maxLevel: 20,
        minPartySize: 2,
        maxPartySize: 6,
        duration: 75,
        rewards: {
            coins: [1500, 3500],
            experience: [1000, 2500],
            items: ['Sacred Relic', 'Temple Staff', 'Blessed Armor', 'Holy Water'],
            rareItems: ['Divine Artifact', 'God\'s Blessing', 'Eternal Flame']
        },
        boss: {
            name: 'Ancient Guardian Titan',
            health: 5500,
            abilities: ['Divine Wrath', 'Stone Prison', 'Healing Light'],
            phases: 2
        },
        difficulty: 3,
        mechanics: ['Puzzle Rooms', 'Divine Trials', 'Blessing Buffs'],
        description: 'A mystical temple holding the power of forgotten deities and ancient wisdom.'
    },
    frost_citadel: {
        name: 'Eternal Frost Citadel',
        emoji: '❄️',
        minLevel: 18,
        maxLevel: 30,
        minPartySize: 4,
        maxPartySize: 8,
        duration: 100,
        rewards: {
            coins: [2800, 6500],
            experience: [2000, 4500],
            items: ['Ice Crystal', 'Frost Blade', 'Winter Crown', 'Frozen Heart'],
            rareItems: ['Eternal Ice Shard', 'Blizzard Cloak', 'Frostlord\'s Throne']
        },
        boss: {
            name: 'Frost Giant Emperor Glacius',
            health: 12000,
            abilities: ['Blizzard Storm', 'Ice Prison', 'Absolute Zero'],
            phases: 3
        },
        difficulty: 5,
        mechanics: ['Freezing Debuffs', 'Ice Platform Puzzles', 'Cold Resistance'],
        description: 'A massive citadel of ice and snow, domain of the eternal frost giants.'
    },
    void_nexus: {
        name: 'Abyssal Void Nexus',
        emoji: '🌑',
        minLevel: 25,
        maxLevel: 40,
        minPartySize: 6,
        maxPartySize: 12,
        duration: 180,
        rewards: {
            coins: [5000, 12000],
            experience: [4000, 8500],
            items: ['Void Essence', 'Reality Blade', 'Dark Crown', 'Soul Crystal'],
            rareItems: ['Nexus Core', 'Void Lord\'s Mantle', 'Reality Anchor']
        },
        boss: {
            name: 'Void Lord Nethys the Infinite',
            health: 25000,
            abilities: ['Reality Tear', 'Void Consume', 'Dimensional Shift'],
            phases: 5
        },
        difficulty: 8,
        mechanics: ['Reality Distortion', 'Void Zones', 'Sanity System'],
        description: 'A nexus point between dimensions where reality itself bends to the Void Lord\'s will.'
    }
};

// Enhanced raid class with more features
class Raid {
    constructor(options) {
        this.id = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.dungeon = options.dungeon;
        this.dungeonData = raidDungeons[options.dungeon];
        this.leader = options.leader;
        this.maxSize = Math.min(options.maxSize, this.dungeonData.maxPartySize);
        this.minSize = Math.max(options.minSize || this.dungeonData.minPartySize, this.dungeonData.minPartySize);
        this.members = [{ ...options.leader, role: 'leader', joinedAt: Date.now() }];
        this.status = 'recruiting'; // recruiting, ready, in-progress, completed, failed
        this.createdAt = Date.now();
        this.startedAt = null;
        this.completedAt = null;
        this.settings = {
            isPublic: options.isPublic || true,
            requiresApproval: options.requiresApproval || false,
            minLevel: options.minLevel || this.dungeonData.minLevel,
            difficulty: options.difficulty || 'normal' // normal, heroic, mythic
        };
        this.progress = {
            currentPhase: 0,
            bossHealth: this.dungeonData.boss.health,
            playersAlive: 1,
            timeElapsed: 0
        };
    }

    addMember(player, role = 'member') {
        if (this.members.length >= this.maxSize) return { success: false, reason: 'Raid is full' };
        if (this.members.find(m => m.id === player.id)) return { success: false, reason: 'Already in raid' };
        
        // Check level requirements
        const playerLevel = player.level || 1;
        if (playerLevel < this.settings.minLevel) {
            return { success: false, reason: `Minimum level ${this.settings.minLevel} required` };
        }
        if (playerLevel > this.dungeonData.maxLevel) {
            return { success: false, reason: `Maximum level ${this.dungeonData.maxLevel} exceeded` };
        }

        this.members.push({ 
            ...player, 
            role: role,
            joinedAt: Date.now(),
            status: 'alive',
            contribution: { damage: 0, healing: 0, utility: 0 }
        });

        if (this.members.length >= this.minSize) {
            this.status = 'ready';
        }
        
        return { success: true };
    }

    removeMember(playerId) {
        const index = this.members.findIndex(m => m.id === playerId);
        if (index === -1) return false;
        
        const member = this.members[index];
        if (member.role === 'leader' && this.members.length > 1) {
            // Transfer leadership to next member
            this.members[1].role = 'leader';
        }
        
        this.members.splice(index, 1);
        
        if (this.members.length < this.minSize) {
            this.status = 'recruiting';
        }
        
        return true;
    }

    async start() {
        if (this.status !== 'ready') return false;
        if (this.members.length < this.minSize) return false;
        
        this.status = 'in-progress';
        this.startedAt = Date.now();
        this.progress.playersAlive = this.members.length;
        
        return true;
    }

    getFormattedDuration() {
        const minutes = this.dungeonData.duration;
        return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
    }

    getDifficultyMultiplier() {
        const multipliers = { normal: 1, heroic: 1.5, mythic: 2.0 };
        return multipliers[this.settings.difficulty] || 1;
    }
}

// Store active raids
const activeRaids = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('⚔️ Organize epic raid parties to conquer legendary dungeons')
        .addStringOption(option =>
            option.setName('dungeon')
                .setDescription('The raid dungeon to tackle')
                .setRequired(false)
                .addChoices(
                    { name: '🏰 Cursed Shadow Castle', value: 'cursed_castle' },
                    { name: '🌋 Infernal Volcanic Forge', value: 'volcanic_forge' },
                    { name: '🗿 Temple of Forgotten Gods', value: 'lost_temple' },
                    { name: '❄️ Eternal Frost Citadel', value: 'frost_citadel' },
                    { name: '🌑 Abyssal Void Nexus', value: 'void_nexus' }
                ))
        .addIntegerOption(option =>
            option.setName('party-size')
                .setDescription('Maximum number of players in the raid')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(12))
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Raid difficulty setting')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Normal', value: 'normal' },
                    { name: '🔥 Heroic', value: 'heroic' },
                    { name: '💀 Mythic', value: 'mythic' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const dungeonType = interaction.options.getString('dungeon');
            const partySize = interaction.options.getInteger('party-size');
            const difficulty = interaction.options.getString('difficulty') || 'normal';
            
            // If no dungeon specified, show raid browser
            if (!dungeonType) {
                await this.showRaidBrowser(interaction);
                return;
            }

            // Get dungeon data
            const dungeonData = raidDungeons[dungeonType];
            if (!dungeonData) {
                await interaction.editReply({
                    content: '❌ Invalid dungeon selected!',
                    ephemeral: true
                });
                return;
            }
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                inventory: [],
                coins: 100,
                experience: 0,
                displayName: interaction.user.displayName
            };

            // Check if player is already in a raid
            let existingRaid = null;
            for (const [id, raid] of activeRaids) {
                if (raid.members.find(m => m.id === userId)) {
                    existingRaid = raid;
                    break;
                }
            }

            if (existingRaid && (existingRaid.status === 'in-progress' || existingRaid.status === 'ready')) {
                await interaction.editReply({
                    content: `❌ You're already in an active raid! Complete or leave it first.\nRaid ID: **${existingRaid.id}**`,
                    ephemeral: true
                });
                return;
            }

            // Check player level requirement
            if (player.level < dungeonData.minLevel) {
                await interaction.editReply({
                    content: `❌ You need to be at least level **${dungeonData.minLevel}** to raid ${dungeonData.name}!\nYour current level: **${player.level}**`,
                    ephemeral: true
                });
                return;
            }

            if (player.level > dungeonData.maxLevel) {
                await interaction.editReply({
                    content: `❌ You're too high level for ${dungeonData.name}! Maximum level: **${dungeonData.maxLevel}**\nYour current level: **${player.level}**`,
                    ephemeral: true
                });
                return;
            }

            // Create new raid
            const raid = new Raid({
                dungeon: dungeonType,
                leader: { ...player, id: userId, displayName: interaction.user.displayName },
                maxSize: partySize || dungeonData.maxPartySize,
                difficulty: difficulty,
                isPublic: true
            });

            activeRaids.set(raid.id, raid);

            // Create response embed
            const difficultyEmojis = { normal: '⚔️', heroic: '🔥', mythic: '💀' };
            const difficultyColors = { normal: '#4169E1', heroic: '#FF6600', mythic: '#8B0000' };
            
            const embed = new EmbedBuilder()
                .setColor(difficultyColors[difficulty])
                .setTitle(`${dungeonData.emoji} Raid: ${dungeonData.name}`)
                .setDescription(`**${dungeonData.description}**\n\n${difficultyEmojis[difficulty]} **${difficulty.toUpperCase()}** difficulty raid is forming!`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🎯 Raid Details', value: `**ID:** ${raid.id}\n**Leader:** ${interaction.user.displayName}\n**Difficulty:** ${difficultyEmojis[difficulty]} ${difficulty.toUpperCase()}\n**Duration:** ~${raid.getFormattedDuration()}`, inline: true },
                    { name: '👥 Party Status', value: `**Current:** ${raid.members.length}/${raid.maxSize}\n**Required:** ${raid.minSize}+ to start\n**Level Range:** ${dungeonData.minLevel}-${dungeonData.maxLevel}\n**Status:** ${raid.status === 'ready' ? '✅ Ready' : '🔄 Recruiting'}`, inline: true },
                    { name: '👑 Boss Fight', value: `**${dungeonData.boss.name}**\n❤️ ${dungeonData.boss.health.toLocaleString()} HP\n🎯 ${dungeonData.boss.phases} phases\n⚡ Special abilities`, inline: true },
                    { name: '🎁 Raid Rewards', value: `💰 **${Math.floor(dungeonData.rewards.coins[0] * raid.getDifficultyMultiplier())}-${Math.floor(dungeonData.rewards.coins[1] * raid.getDifficultyMultiplier())}** coins\n🌟 **${Math.floor(dungeonData.rewards.experience[0] * raid.getDifficultyMultiplier())}-${Math.floor(dungeonData.rewards.experience[1] * raid.getDifficultyMultiplier())}** XP\n🎁 **Legendary Equipment**\n🏆 **Raid Achievements**`, inline: true },
                    { name: '⚔️ Raid Mechanics', value: dungeonData.mechanics.map(m => `• ${m}`).join('\n'), inline: true },
                    { name: '📋 Requirements', value: `• Minimum Level: **${dungeonData.minLevel}**\n• Maximum Level: **${dungeonData.maxLevel}**\n• Recommended: Good equipment\n• Suggested: Voice communication`, inline: true }
                )
                .setFooter({ text: `Use buttons below to join or manage this raid!` })
                .setTimestamp();

            // Create action row with buttons
            const joinButton = new ButtonBuilder()
                .setCustomId(`raid_join_${raid.id}`)
                .setLabel('Join Raid')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚔️');

            const infoButton = new ButtonBuilder()
                .setCustomId(`raid_info_${raid.id}`)
                .setLabel('Raid Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('ℹ️');

            const settingsButton = new ButtonBuilder()
                .setCustomId(`raid_settings_${raid.id}`)
                .setLabel('Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️');

            const startButton = new ButtonBuilder()
                .setCustomId(`raid_start_${raid.id}`)
                .setLabel('Start Raid')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀')
                .setDisabled(raid.status !== 'ready');

            const row = new ActionRowBuilder()
                .addComponents(joinButton, infoButton, settingsButton, startButton);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Auto-cleanup after 30 minutes
            setTimeout(() => {
                if (activeRaids.has(raid.id) && activeRaids.get(raid.id).status === 'recruiting') {
                    activeRaids.delete(raid.id);
                }
            }, 1800000);

        } catch (error) {
            console.error('Error in raid command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while organizing the raid.',
                ephemeral: true
            });
        }
    },

    async showRaidBrowser(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('⚔️ Epic Raid Browser')
            .setDescription('**Welcome to the Raid Hub!** Choose your legendary adventure and assemble your party.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '🎯 Available Raid Dungeons',
                    value: Object.values(raidDungeons).map(dungeon => 
                        `${dungeon.emoji} **${dungeon.name}**\n` +
                        `Level ${dungeon.minLevel}-${dungeon.maxLevel} • ${dungeon.minPartySize}-${dungeon.maxPartySize} players • ${'⭐'.repeat(dungeon.difficulty)}`
                    ).join('\n\n'),
                    inline: false
                },
                {
                    name: '📊 Active Raids',
                    value: activeRaids.size > 0 ? 
                        `🔥 **${activeRaids.size}** raids currently active\n` +
                        `👥 **${Array.from(activeRaids.values()).reduce((sum, raid) => sum + raid.members.length, 0)}** adventurers participating` :
                        '🌙 No active raids at the moment',
                    inline: true
                },
                {
                    name: '🎮 How Raids Work',
                    value: '• **Form a party** of 2-12 players\n• **Face legendary bosses** with multiple phases\n• **Coordinate strategies** with your team\n• **Earn epic rewards** and achievements\n• **Challenge different difficulties** for better loot',
                    inline: true
                }
            ])
            .setFooter({ text: 'Select a dungeon below to create or join a raid!' })
            .setTimestamp();

        const dungeonSelect = new StringSelectMenuBuilder()
            .setCustomId('raid_dungeon_select')
            .setPlaceholder('🗡️ Choose a raid dungeon...')
            .addOptions(
                Object.entries(raidDungeons).map(([id, dungeon]) => ({
                    label: dungeon.name,
                    description: `Level ${dungeon.minLevel}-${dungeon.maxLevel} • ${dungeon.minPartySize}-${dungeon.maxPartySize} players • ${'⭐'.repeat(dungeon.difficulty)} difficulty`,
                    value: `create_raid_${id}`,
                    emoji: dungeon.emoji
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(dungeonSelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('raid_browser_active')
                    .setLabel('View Active Raids')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('raid_browser_my_raids')
                    .setLabel('My Raids')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('raid_browser_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('raid_browser_guide')
                    .setLabel('Raid Guide')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
    }
};
