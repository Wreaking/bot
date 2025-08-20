const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Raid dungeons configuration
const dungeons = {
    castle: {
        name: 'Ancient Castle',
        emoji: '🏰',
        minLevel: 10,
        rewards: ['Royal Crown', 'Ancient Sword', 'Castle Shield', 'Noble Armor'],
        boss: 'Undead King',
        difficulty: 3
    },
    dragon: {
        name: 'Dragon\'s Lair',
        emoji: '🌋',
        minLevel: 15,
        rewards: ['Dragon Scale', 'Fire Sword', 'Dragon Helm', 'Flame Crystal'],
        boss: 'Elder Dragon',
        difficulty: 5
    },
    temple: {
        name: 'Lost Temple',
        emoji: '🗿',
        minLevel: 8,
        rewards: ['Sacred Relic', 'Temple Staff', 'Blessed Armor', 'Holy Water'],
        boss: 'Ancient Guardian',
        difficulty: 2
    },
    frost: {
        name: 'Frost Cavern',
        emoji: '❄️',
        minLevel: 12,
        rewards: ['Ice Crystal', 'Frost Blade', 'Winter Crown', 'Frozen Heart'],
        boss: 'Frost Giant',
        difficulty: 4
    },
    shadow: {
        name: 'Shadow Realm',
        emoji: '🌑',
        minLevel: 20,
        rewards: ['Shadow Essence', 'Void Blade', 'Dark Crown', 'Soul Crystal'],
        boss: 'Shadow Lord',
        difficulty: 5
    }
};

// Store active raids
const activeRaids = new Map();

class Raid {
    constructor(options) {
        this.id = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.dungeon = options.dungeon;
        this.leader = options.leader;
        this.maxSize = options.maxSize;
        this.members = [options.leader];
        this.status = 'recruiting'; // recruiting, in-progress, completed, failed
        this.createdAt = Date.now();
        this.startedAt = null;
        this.completedAt = null;
    }

    addMember(player) {
        if (this.members.length >= this.maxSize) return false;
        if (this.members.find(m => m.id === player.id)) return false;
        this.members.push(player);
        if (this.members.length === this.maxSize) {
            this.status = 'ready';
        }
        return true;
    }

    async start() {
        this.status = 'in-progress';
        this.startedAt = Date.now();
        // Raid logic will go here
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('⚔️ Organize a raid party to tackle powerful dungeons')
        .addStringOption(option =>
            option.setName('dungeon')
                .setDescription('The dungeon to raid')
                .setRequired(true)
                .addChoices(
                    { name: '🏰 Ancient Castle', value: 'castle' },
                    { name: '🌋 Dragon\'s Lair', value: 'dragon' },
                    { name: '🗿 Lost Temple', value: 'temple' },
                    { name: '❄️ Frost Cavern', value: 'frost' },
                    { name: '🌑 Shadow Realm', value: 'shadow' }
                ))
        .addIntegerOption(option =>
            option.setName('party-size')
                .setDescription('Number of players in the raid (2-10)')
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(10)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const dungeonType = interaction.options.getString('dungeon');
            const partySize = interaction.options.getInteger('party-size');
            
            // Get dungeon data
            const dungeon = dungeons[dungeonType];
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                inventory: [],
                coins: 100,
                experience: 0
            };

            // Check if player is already in a raid
            let existingRaid = null;
            for (const [id, raid] of activeRaids) {
                if (raid.members.find(m => m.id === userId)) {
                    existingRaid = raid;
                    break;
                }
            }

            if (existingRaid && existingRaid.status === 'in-progress') {
                await interaction.editReply({
                    content: `❌ You're already in an active raid! Complete or leave it first.`,
                    ephemeral: true
                });
                return;
            }

            // Check player level requirement
            if (player.level < dungeon.minLevel) {
                await interaction.editReply({
                    content: `❌ You need to be at least level ${dungeon.minLevel} to raid ${dungeon.name}!`,
                    ephemeral: true
                });
                return;
            }

            // Create new raid
            const raid = new Raid({
                dungeon: dungeonType,
                leader: interaction.user,
                maxSize: partySize
            });

            activeRaids.set(raid.id, raid);

            // Create response embed
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`${dungeon.emoji} Raid: ${dungeon.name}`)
                .setDescription(`A new raid party is forming!`)
                .addFields(
                    { name: 'Raid ID', value: raid.id, inline: true },
                    { name: 'Leader', value: interaction.user.tag, inline: true },
                    { name: 'Party Size', value: `${raid.members.length}/${partySize}`, inline: true },
                    { name: '👑 Boss', value: dungeon.boss, inline: true },
                    { name: '⚔️ Difficulty', value: '☠️'.repeat(dungeon.difficulty), inline: true },
                    { name: '💎 Potential Rewards', value: dungeon.rewards.join(', '), inline: false },
                    { name: '📋 Requirements', value: `Minimum Level: ${dungeon.minLevel}`, inline: false }
                )
                .setFooter({ text: `Use /join-raid ${raid.id} to participate!` });

            // Create action row with buttons
            const joinButton = new ButtonBuilder()
                .setCustomId(`raid_join_${raid.id}`)
                .setLabel('Join Raid')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(joinButton);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Error in raid command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while organizing the raid.',
                ephemeral: true
            });
        }
    },
};