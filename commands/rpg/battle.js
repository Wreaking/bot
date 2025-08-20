const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const monsters = [
    { name: 'Goblin Thief', hp: 30, attack: 8, defense: 2, reward: 50, emoji: '👹' },
    { name: 'Shadow Wolf', hp: 45, attack: 12, defense: 4, reward: 80, emoji: '🐺' },
    { name: 'Skeleton Warrior', hp: 60, attack: 15, defense: 6, reward: 120, emoji: '💀' },
    { name: 'Fire Elemental', hp: 80, attack: 20, defense: 8, reward: 180, emoji: '🔥' },
    { name: 'Ice Troll', hp: 100, attack: 25, defense: 12, reward: 250, emoji: '🧊' },
    { name: 'Dragon Whelp', hp: 150, attack: 35, defense: 15, reward: 400, emoji: '🐉' },
    { name: 'Dark Mage', hp: 120, attack: 40, defense: 10, reward: 350, emoji: '🧙‍♂️' },
    { name: 'Ancient Guardian', hp: 200, attack: 30, defense: 25, reward: 500, emoji: '🗿' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('⚔️ Engage in combat with monsters and earn rewards!')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose battle difficulty')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Easy (Goblins & Wolves)', value: 'easy' },
                    { name: '🟡 Medium (Skeletons & Elementals)', value: 'medium' },
                    { name: '🔴 Hard (Trolls & Dragons)', value: 'hard' },
                    { name: '⚫ Boss (Ancient Guardians)', value: 'boss' }
                ))
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge another player to PvP combat')
                .setRequired(false)),
    
    async execute(interaction) {
        const difficulty = interaction.options?.getString('difficulty') || 'easy';
        const opponent = interaction.options?.getUser('opponent');
        const userId = interaction.user.id;
        
        // Check if user is already in battle
        if (interaction.client.activeBattles.has(userId)) {
            return interaction.reply({
                content: '⚔️ You are already in combat! Finish your current battle first.',
                ephemeral: true
            });
        }
        
        // PvP Battle
        if (opponent) {
            return await this.initiatePvP(interaction, opponent);
        }
        
        // PvE Battle
        await this.initiatePvE(interaction, difficulty);
    },
    
    async initiatePvE(interaction, difficulty) {
        const userId = interaction.user.id;
        
        // Get user data
        const userData = await db.getUser(userId) || {
            stats: { level: 1, hp: 100, attack: 10, defense: 5 },
            inventory: { coins: 0 },
            equipment: {}
        };
        
        // Calculate player stats with equipment
        const playerStats = this.calculatePlayerStats(userData);
        
        // Select monster based on difficulty
        let monsterPool = [];
        switch (difficulty) {
            case 'easy':
                monsterPool = monsters.slice(0, 2);
                break;
            case 'medium':
                monsterPool = monsters.slice(2, 4);
                break;
            case 'hard':
                monsterPool = monsters.slice(4, 6);
                break;
            case 'boss':
                monsterPool = monsters.slice(6, 8);
                break;
        }
        
        const monster = { ...monsterPool[Math.floor(Math.random() * monsterPool.length)] };
        monster.maxHp = monster.hp;
        
        // Store battle state
        const battleState = {
            type: 'pve',
            player: {
                id: userId,
                name: interaction.user.displayName,
                hp: playerStats.hp,
                maxHp: playerStats.hp,
                attack: playerStats.attack,
                defense: playerStats.defense,
                mp: playerStats.mp || 50
            },
            monster: monster,
            turn: 'player',
            round: 1,
            startTime: Date.now()
        };
        
        interaction.client.activeBattles.set(userId, battleState);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle(`⚔️ Battle Commenced!`)
            .setDescription(`**${interaction.user.displayName}** encounters a wild **${monster.name}**!`)
            .addFields([
                {
                    name: `👤 ${interaction.user.displayName}`,
                    value: `❤️ HP: ${playerStats.hp}/${playerStats.hp}\n⚔️ ATK: ${playerStats.attack}\n🛡️ DEF: ${playerStats.defense}`,
                    inline: true
                },
                {
                    name: `${monster.emoji} ${monster.name}`,
                    value: `❤️ HP: ${monster.hp}/${monster.maxHp}\n⚔️ ATK: ${monster.attack}\n🛡️ DEF: ${monster.defense}`,
                    inline: true
                },
                {
                    name: '🎯 Battle Info',
                    value: `Turn: **Player**\nRound: **${battleState.round}**\nReward: **${monster.reward}** coins`,
                    inline: false
                }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Choose your action!' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_attack')
                    .setLabel('⚔️ Attack')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('battle_defend')
                    .setLabel('🛡️ Defend')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('battle_magic')
                    .setLabel('🔮 Magic')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('battle_item')
                    .setLabel('🧪 Use Item')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('battle_flee')
                    .setLabel('🏃 Flee')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
        
        // Set battle timeout
        setTimeout(() => {
            if (interaction.client.activeBattles.has(userId)) {
                interaction.client.activeBattles.delete(userId);
                interaction.followUp({
                    content: '⏰ Battle timed out! The monster escaped.',
                    ephemeral: true
                });
            }
        }, 300000); // 5 minutes
    },
    
    async initiatePvP(interaction, opponent) {
        if (opponent.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot challenge yourself to a battle!',
                ephemeral: true
            });
        }
        
        if (opponent.bot) {
            return interaction.reply({
                content: '❌ You cannot challenge bots to battle!',
                ephemeral: true
            });
        }
        
        // Check if opponent is already in battle
        if (interaction.client.activeBattles.has(opponent.id)) {
            return interaction.reply({
                content: `❌ ${opponent.displayName} is already in combat!`,
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('⚔️ PvP Battle Challenge!')
            .setDescription(`**${interaction.user.displayName}** has challenged **${opponent.displayName}** to combat!`)
            .addFields([
                { name: '🏆 Stakes', value: '100 coins to the winner', inline: true },
                { name: '⏰ Time Limit', value: '30 seconds to accept', inline: true },
                { name: '🎮 Battle Type', value: 'Player vs Player', inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'The challenged player must accept to begin!' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pvp_accept_${interaction.user.id}`)
                    .setLabel('✅ Accept Challenge')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`pvp_decline_${interaction.user.id}`)
                    .setLabel('❌ Decline')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.reply({ 
            content: `${opponent}, you have been challenged to a PvP battle!`,
            embeds: [embed], 
            components: [buttons] 
        });
        
        // Set challenge timeout
        setTimeout(() => {
            interaction.editReply({
                content: '⏰ Challenge expired - no response received.',
                embeds: [],
                components: []
            });
        }, 30000);
    },
    
    calculatePlayerStats(userData) {
        const baseStats = {
            hp: 100,
            attack: 10,
            defense: 5,
            mp: 50
        };
        
        // Apply level bonuses
        const level = userData.stats?.level || 1;
        baseStats.hp += (level - 1) * 10;
        baseStats.attack += (level - 1) * 2;
        baseStats.defense += (level - 1) * 1;
        baseStats.mp += (level - 1) * 5;
        
        // Apply equipment bonuses
        if (userData.equipment?.weapon) {
            baseStats.attack += 10; // Basic weapon bonus
        }
        if (userData.equipment?.armor) {
            baseStats.defense += 8; // Basic armor bonus
        }
        if (userData.equipment?.accessory) {
            baseStats.hp += 20; // Basic accessory bonus
        }
        
        return baseStats;
    }
};