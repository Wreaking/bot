const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Enhanced battle system with advanced mechanics
const combatStyles = {
    aggressive: { attackBonus: 3, defenseBonus: -1, criticalChance: 0.15 },
    defensive: { attackBonus: -1, defenseBonus: 3, criticalChance: 0.05 },
    balanced: { attackBonus: 1, defenseBonus: 1, criticalChance: 0.10 },
    berserker: { attackBonus: 5, defenseBonus: -3, criticalChance: 0.25 }
};

const monsters = {
    goblin: { 
        name: 'Goblin Warrior', 
        health: 80, 
        maxHealth: 80,
        attack: 12, 
        defense: 4, 
        level: 1, 
        reward: { xp: 150, gold: 75, items: ['rusty_dagger', 'goblin_ear'] },
        emoji: '👹',
        abilities: ['slash', 'dodge'],
        weakness: 'fire',
        resistance: 'poison'
    },
    orc: { 
        name: 'Orc Berserker', 
        health: 180, 
        maxHealth: 180,
        attack: 20, 
        defense: 8, 
        level: 3, 
        reward: { xp: 350, gold: 200, items: ['orc_axe', 'berserker_helm'] },
        emoji: '🧌',
        abilities: ['rage', 'intimidate'],
        weakness: 'ice',
        resistance: 'physical'
    },
    drake: { 
        name: 'Shadow Drake', 
        health: 350, 
        maxHealth: 350,
        attack: 35, 
        defense: 15, 
        level: 5, 
        reward: { xp: 750, gold: 500, items: ['drake_scale', 'shadow_essence'] },
        emoji: '🐉',
        abilities: ['shadow_breath', 'wing_attack'],
        weakness: 'light',
        resistance: 'shadow'
    },
    dragon: { 
        name: 'Ancient Dragon', 
        health: 800, 
        maxHealth: 800,
        attack: 55, 
        defense: 25, 
        level: 10, 
        reward: { xp: 1500, gold: 1200, items: ['dragon_heart', 'ancient_scales'] },
        emoji: '🐲',
        abilities: ['fire_breath', 'tail_sweep', 'roar'],
        weakness: 'ice',
        resistance: 'fire'
    },
    demon: { 
        name: 'Demon Lord', 
        health: 1500, 
        maxHealth: 1500,
        attack: 80, 
        defense: 35, 
        level: 15, 
        reward: { xp: 3000, gold: 2500, items: ['demon_crown', 'soul_gem'] },
        emoji: '👿',
        abilities: ['hellfire', 'soul_drain', 'dark_magic'],
        weakness: 'holy',
        resistance: 'dark'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('⚔️ Engage in epic battles with advanced combat mechanics')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge another player to battle')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('monster')
                .setDescription('Choose a monster to fight')
                .addChoices(
                    { name: '👹 Goblin Warrior (Lv.1)', value: 'goblin' },
                    { name: '🧌 Orc Berserker (Lv.3)', value: 'orc' },
                    { name: '🐉 Shadow Drake (Lv.5)', value: 'drake' },
                    { name: '🐲 Ancient Dragon (Lv.10)', value: 'dragon' },
                    { name: '👿 Demon Lord (Lv.15)', value: 'demon' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const player = await db.getPlayer(interaction.user.id) || {
                level: 1, health: 100, maxHealth: 100, attack: 15, defense: 8,
                coins: 100, experience: 0, battleWins: 0, battleLosses: 0,
                inventory: { items: [], potions: [] }, skills: { combat: { level: 1 } }
            };

            const opponent = interaction.options.getUser('opponent');
            const monsterType = interaction.options.getString('monster');

            // Check if player is already in battle
            if (interaction.client.activeBattles?.has(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('⚔️ Already in Battle')
                    .setDescription('You are already engaged in combat! Finish your current battle first.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (!opponent && !monsterType) {
                await this.showBattleMenu(interaction, player);
                return;
            }

            if (opponent) {
                await this.initiatePvPBattle(interaction, player, opponent);
            } else {
                await this.initiatePvEBattle(interaction, player, monsterType);
            }

        } catch (error) {
            console.error('Battle command error:', error);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Battle Error')
                .setDescription('Failed to initiate battle. Please try again.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async showBattleMenu(interaction, player) {
        const winRate = player.battleWins ? Math.round((player.battleWins / (player.battleWins + (player.battleLosses || 0))) * 100) : 0;

        const embed = new EmbedBuilder()
            .setColor('#4A90E2')
            .setTitle('⚔️ Epic Battle Arena')
            .setDescription('**Choose your destiny, warrior!** Face fearsome monsters or challenge other players in combat.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                { 
                    name: '👤 Warrior Profile', 
                    value: `**Level:** ${player.level || 1} 🌟\n**Health:** ${player.health || 100}/${player.maxHealth || 100} ❤️\n**Power:** ${player.attack || 10} ⚔️\n**Defense:** ${player.defense || 5} 🛡️`, 
                    inline: true 
                },
                { 
                    name: '🏆 Battle Record', 
                    value: `**Victories:** ${player.battleWins || 0} 🏆\n**Defeats:** ${player.battleLosses || 0} 💀\n**Win Rate:** ${winRate}% 📊\n**Combat Rank:** ${this.getCombatRank(player.battleWins || 0)} 🎖️`, 
                    inline: true 
                },
                { 
                    name: '💰 Potential Rewards', 
                    value: `**Experience:** Up to 3,000 XP 🌟\n**Gold:** Up to 2,500 💰\n**Items:** Legendary Equipment 🎁\n**Titles:** Battle Honors 🏅`, 
                    inline: true 
                },
                {
                    name: '🎮 Combat Features',
                    value: '• **Combat Styles:** Choose your fighting approach\n• **Special Abilities:** Unlock powerful moves\n• **Elemental System:** Exploit weaknesses\n• **Equipment Effects:** Gear matters in battle\n• **Critical Strikes:** Deal massive damage',
                    inline: false
                },
                {
                    name: '🗡️ Available Monsters',
                    value: '👹 **Goblin Warrior** - Perfect for beginners\n🧌 **Orc Berserker** - Moderate challenge\n🐉 **Shadow Drake** - Experienced fighters\n🐲 **Ancient Dragon** - Elite warriors only\n👿 **Demon Lord** - Legendary difficulty',
                    inline: false
                }
            ])
            .setFooter({ text: 'Prepare your equipment and choose your combat style!' })
            .setTimestamp();

        const monsterSelect = new StringSelectMenuBuilder()
            .setCustomId('battle_monster_select')
            .setPlaceholder('🗡️ Choose your opponent...')
            .addOptions([
                {
                    label: 'Goblin Warrior',
                    description: 'Level 1 • Beginner • 150 XP • Weak to Fire',
                    value: 'battle_goblin',
                    emoji: '👹'
                },
                {
                    label: 'Orc Berserker',
                    description: 'Level 3 • Intermediate • 350 XP • Weak to Ice',
                    value: 'battle_orc',
                    emoji: '🧌'
                },
                {
                    label: 'Shadow Drake',
                    description: 'Level 5 • Advanced • 750 XP • Weak to Light',
                    value: 'battle_drake',
                    emoji: '🐉'
                },
                {
                    label: 'Ancient Dragon',
                    description: 'Level 10 • Expert • 1500 XP • Weak to Ice',
                    value: 'battle_dragon',
                    emoji: '🐲'
                },
                {
                    label: 'Demon Lord',
                    description: 'Level 15 • Legendary • 3000 XP • Weak to Holy',
                    value: 'battle_demon',
                    emoji: '👿'
                }
            ]);

        const row1 = new ActionRowBuilder().addComponents(monsterSelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_pvp_challenge')
                    .setLabel('Player Duel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('battle_arena_ranked')
                    .setLabel('Ranked Arena')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('battle_tournament_join')
                    .setLabel('Tournament')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏅'),
                new ButtonBuilder()
                    .setCustomId('battle_training_ground')
                    .setLabel('Training')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎯')
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_heal_up')
                    .setLabel('Full Heal (50💰)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('❤️'),
                new ButtonBuilder()
                    .setCustomId('battle_check_equipment')
                    .setLabel('Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('battle_combat_style')
                    .setLabel('Combat Style')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🥋'),
                new ButtonBuilder()
                    .setCustomId('battle_history_stats')
                    .setLabel('Battle History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
    },

    async initiatePvEBattle(interaction, player, monsterType) {
        const monster = { ...monsters[monsterType] };
        if (!monster) return;

        // Check level requirement
        if (player.level < monster.level) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⚠️ Level Requirement Not Met')
                .setDescription(`You need to be at least level **${monster.level}** to fight the ${monster.name}!\nYour current level: **${player.level}**`)
                .addFields([
                    { name: '💡 Suggestion', value: 'Try fighting weaker monsters first to gain experience!', inline: false }
                ])
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const battleId = `${interaction.user.id}_${Date.now()}`;
        const battleState = {
            player: {
                id: interaction.user.id,
                name: interaction.user.displayName,
                health: player.health || 100,
                maxHealth: player.maxHealth || 100,
                attack: player.attack || 10,
                defense: player.defense || 5,
                level: player.level || 1,
                combatStyle: 'balanced',
                statusEffects: [],
                criticalChance: 0.10
            },
            monster: { ...monster },
            turn: 'player',
            round: 1,
            battleLog: []
        };

        // Store battle state
        if (!interaction.client.activeBattles) {
            interaction.client.activeBattles = new Map();
        }
        interaction.client.activeBattles.set(interaction.user.id, battleState);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle(`⚔️ Battle Commenced!`)
            .setDescription(`**${battleState.player.name}** faces the mighty **${monster.name}**!\n\n*${this.getMonsterFlavorText(monsterType)}*`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { 
                    name: '👤 You', 
                    value: `❤️ **${battleState.player.health}**/${battleState.player.maxHealth}\n⚔️ Attack: **${battleState.player.attack}**\n🛡️ Defense: **${battleState.player.defense}**\n🥋 Style: **${battleState.player.combatStyle}**`, 
                    inline: true 
                },
                { 
                    name: `${monster.emoji} ${monster.name}`, 
                    value: `❤️ **${monster.health}**/${monster.maxHealth}\n⚔️ Attack: **${monster.attack}**\n🛡️ Defense: **${monster.defense}**\n🎯 Level: **${monster.level}**`, 
                    inline: true 
                },
                { 
                    name: '🎲 Battle Info', 
                    value: `**Round:** ${battleState.round}\n**Turn:** Your move!\n**Weakness:** ${monster.weakness}\n**Resistance:** ${monster.resistance}`, 
                    inline: true 
                }
            ])
            .setFooter({ text: `Battle ID: ${battleId} | Choose your action wisely!` })
            .setTimestamp();

        const battleActions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`battle_attack_${battleId}`)
                    .setLabel('Attack')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId(`battle_defend_${battleId}`)
                    .setLabel('Defend')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId(`battle_special_${battleId}`)
                    .setLabel('Special Move')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId(`battle_item_${battleId}`)
                    .setLabel('Use Item')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId(`battle_flee_${battleId}`)
                    .setLabel('Retreat')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃')
            );

        await interaction.editReply({ embeds: [embed], components: [battleActions] });

        // Auto-timeout after 10 minutes
        setTimeout(() => {
            if (interaction.client.activeBattles?.has(interaction.user.id)) {
                interaction.client.activeBattles.delete(interaction.user.id);
                interaction.followUp({
                    content: '⏰ Battle timed out! You retreat to safety.',
                    ephemeral: true
                });
            }
        }, 600000);
    },

    getCombatRank(wins) {
        if (wins >= 100) return 'Legendary Champion';
        if (wins >= 50) return 'Battle Master';
        if (wins >= 25) return 'Veteran Warrior';
        if (wins >= 10) return 'Seasoned Fighter';
        if (wins >= 5) return 'Apprentice';
        return 'Novice';
    },

    getMonsterFlavorText(monsterType) {
        const texts = {
            goblin: 'The goblin snarls and brandishes its crude weapon menacingly.',
            orc: 'The massive orc roars with fury, muscles bulging with berserker rage.',
            drake: 'Shadow essence swirls around the drake as it prepares to strike.',
            dragon: 'Ancient scales gleam as the dragon\'s eyes burn with primordial fire.',
            demon: 'Dark energy radiates from the demon lord\'s imposing form.'
        };
        return texts[monsterType] || 'Your opponent prepares for battle.';
    }
};