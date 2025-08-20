
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Engage in epic battles against monsters or other players')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge another player to battle')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('monster')
                .setDescription('Choose a monster to fight')
                .addChoices(
                    { name: 'Goblin Warrior', value: 'goblin' },
                    { name: 'Orc Berserker', value: 'orc' },
                    { name: 'Shadow Drake', value: 'drake' },
                    { name: 'Ancient Dragon', value: 'dragon' },
                    { name: 'Demon Lord', value: 'demon' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const player = await db.getPlayer(interaction.user.id);
            const opponent = interaction.options.getUser('opponent');
            const monsterType = interaction.options.getString('monster');

            // Check if player is already in battle
            if (client.activeBattles && client.activeBattles.has(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('⚔️ Already in Battle')
                    .setDescription('You are already engaged in combat!')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
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
                .setColor(config.embedColors.error)
                .setTitle('❌ Battle Error')
                .setDescription('Failed to initiate battle. Please try again.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async showBattleMenu(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.battle)
            .setTitle('⚔️ Battle Arena')
            .setDescription('Choose your battle type and prepare for combat!')
            .addFields([
                { 
                    name: '👤 Player Stats', 
                    value: `**Level:** ${player.level || 1}\n**Health:** ${player.health || 100}/${player.maxHealth || 100}\n**Attack:** ${player.attack || 10}\n**Defense:** ${player.defense || 5}`, 
                    inline: true 
                },
                { 
                    name: '🏆 Battle Stats', 
                    value: `**Wins:** ${player.battleWins || 0}\n**Losses:** ${player.battleLosses || 0}\n**Win Rate:** ${player.battleWins ? Math.round((player.battleWins / (player.battleWins + (player.battleLosses || 0))) * 100) : 0}%`, 
                    inline: true 
                },
                { 
                    name: '💰 Rewards Available', 
                    value: `**Experience:** Up to 500 XP\n**Gold:** Up to 1000 ${config.emojis.coin}\n**Items:** Battle loot`, 
                    inline: true 
                },
                {
                    name: '🎮 Battle Types',
                    value: '**PvE:** Fight against AI monsters\n**PvP:** Challenge other players\n**Arena:** Ranked competitive battles\n**Dungeon:** Team-based encounters',
                    inline: false
                }
            ])
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const monsterSelect = new StringSelectMenuBuilder()
            .setCustomId('battle_monster')
            .setPlaceholder('Choose a monster to fight...')
            .addOptions([
                {
                    label: 'Goblin Warrior',
                    description: 'Level 1 • Easy difficulty • 100 XP reward',
                    value: 'battle_goblin',
                    emoji: '👹'
                },
                {
                    label: 'Orc Berserker',
                    description: 'Level 3 • Medium difficulty • 250 XP reward',
                    value: 'battle_orc',
                    emoji: '🧌'
                },
                {
                    label: 'Shadow Drake',
                    description: 'Level 5 • Hard difficulty • 500 XP reward',
                    value: 'battle_drake',
                    emoji: '🐉'
                },
                {
                    label: 'Ancient Dragon',
                    description: 'Level 10 • Very Hard difficulty • 1000 XP reward',
                    value: 'battle_dragon',
                    emoji: '🐲'
                },
                {
                    label: 'Demon Lord',
                    description: 'Level 15 • Legendary difficulty • 2500 XP reward',
                    value: 'battle_demon',
                    emoji: '👿'
                }
            ]);

        const row1 = new ActionRowBuilder().addComponents(monsterSelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_pvp')
                    .setLabel('Player vs Player')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('battle_arena')
                    .setLabel('Ranked Arena')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('battle_tournament')
                    .setLabel('Tournament')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏅')
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_heal')
                    .setLabel('Heal Up')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❤️'),
                new ButtonBuilder()
                    .setCustomId('battle_equip')
                    .setLabel('Check Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('battle_stats')
                    .setLabel('Battle History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    },

    async initiatePvEBattle(interaction, player, monsterType) {
        const monsters = {
            goblin: { name: 'Goblin Warrior', health: 50, attack: 8, defense: 2, level: 1, reward: { xp: 100, gold: 50 } },
            orc: { name: 'Orc Berserker', health: 120, attack: 15, defense: 5, level: 3, reward: { xp: 250, gold: 150 } },
            drake: { name: 'Shadow Drake', health: 200, attack: 25, defense: 8, level: 5, reward: { xp: 500, gold: 300 } },
            dragon: { name: 'Ancient Dragon', health: 500, attack: 40, defense: 15, level: 10, reward: { xp: 1000, gold: 750 } },
            demon: { name: 'Demon Lord', health: 1000, attack: 60, defense: 25, level: 15, reward: { xp: 2500, gold: 1500 } }
        };

        const monster = monsters[monsterType];
        if (!monster) return;

        const battleId = `${interaction.user.id}_${Date.now()}`;
        const battleState = {
            player: {
                id: interaction.user.id,
                name: interaction.user.displayName,
                health: player.health || 100,
                maxHealth: player.maxHealth || 100,
                attack: player.attack || 10,
                defense: player.defense || 5,
                level: player.level || 1
            },
            monster: { ...monster, maxHealth: monster.health },
            turn: 'player',
            round: 1
        };

        // Store battle state globally
        if (!interaction.client.activeBattles) {
            interaction.client.activeBattles = new Map();
        }
        interaction.client.activeBattles.set(interaction.user.id, battleState);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors.battle)
            .setTitle('⚔️ Battle Initiated!')
            .setDescription(`**${battleState.player.name}** vs **${monster.name}**`)
            .addFields([
                { 
                    name: '👤 You', 
                    value: `❤️ ${battleState.player.health}/${battleState.player.maxHealth}\n⚔️ Attack: ${battleState.player.attack}\n🛡️ Defense: ${battleState.player.defense}`, 
                    inline: true 
                },
                { 
                    name: `${this.getMonsterEmoji(monsterType)} ${monster.name}`, 
                    value: `❤️ ${monster.health}/${monster.maxHealth}\n⚔️ Attack: ${monster.attack}\n🛡️ Defense: ${monster.defense}`, 
                    inline: true 
                },
                { 
                    name: '🎯 Your Turn', 
                    value: 'Choose your action wisely!', 
                    inline: false 
                }
            ])
            .setFooter({ text: `Round ${battleState.round} | Battle ID: ${battleId}` })
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
                    .setLabel('Special Attack')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId(`battle_item_${battleId}`)
                    .setLabel('Use Item')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId(`battle_flee_${battleId}`)
                    .setLabel('Flee')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃')
            );

        await interaction.reply({ embeds: [embed], components: [battleActions] });
    },

    getMonsterEmoji(monsterType) {
        const emojis = {
            goblin: '👹',
            orc: '🧌',
            drake: '🐉',
            dragon: '🐲',
            demon: '👿'
        };
        return emojis[monsterType] || '👾';
    },

    async handleSelectMenu(interaction, action) {
        if (action.startsWith('battle_')) {
            const monsterType = action.replace('battle_', '');
            const player = await db.getPlayer(interaction.user.id);
            await this.initiatePvEBattle(interaction, player, monsterType);
        }
    },

    async handleButtonInteraction(interaction, buttonId) {
        const player = await db.getPlayer(interaction.user.id);

        if (buttonId.includes('battle_')) {
            const [action, type, battleId] = buttonId.split('_');
            
            switch(type) {
                case 'pvp':
                    const embed1 = new EmbedBuilder()
                        .setColor(config.embedColors.info)
                        .setTitle('👤 Player vs Player')
                        .setDescription('Use `/battle @user` to challenge another player!')
                        .setTimestamp();
                    await interaction.update({ embeds: [embed1], components: [] });
                    break;

                case 'arena':
                    const embed2 = new EmbedBuilder()
                        .setColor(config.embedColors.info)
                        .setTitle('🏆 Ranked Arena')
                        .setDescription('Coming soon! Compete in ranked battles.')
                        .setTimestamp();
                    await interaction.update({ embeds: [embed2], components: [] });
                    break;

                case 'heal':
                    if (player.coins >= 50) {
                        player.coins -= 50;
                        player.health = player.maxHealth || 100;
                        await db.savePlayer(player);
                        
                        const embed = new EmbedBuilder()
                            .setColor(config.embedColors.success)
                            .setTitle('❤️ Fully Healed!')
                            .setDescription(`You paid 50 ${config.emojis.coin} coins and restored your health to maximum!`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [embed], components: [] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(config.embedColors.error)
                            .setTitle('💸 Insufficient Funds')
                            .setDescription(`You need 50 ${config.emojis.coin} coins to heal!`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [embed], components: [] });
                    }
                    break;

                default:
                    await this.processBattleAction(interaction, type, battleId);
                    break;
            }
        }
    },

    async processBattleAction(interaction, action, battleId) {
        const battleState = interaction.client.activeBattles?.get(interaction.user.id);
        if (!battleState) {
            await interaction.reply({ content: '❌ Battle not found or expired!', ephemeral: true });
            return;
        }

        let resultMessage = '';
        let playerDamage = 0;
        let monsterDamage = 0;

        // Process player action
        switch(action) {
            case 'attack':
                playerDamage = Math.max(1, battleState.player.attack - battleState.monster.defense + Math.floor(Math.random() * 5));
                battleState.monster.health -= playerDamage;
                resultMessage += `⚔️ You attack for ${playerDamage} damage!\n`;
                break;
            
            case 'defend':
                battleState.player.defense += 2;
                resultMessage += `🛡️ You raise your guard! Defense increased by 2!\n`;
                break;
            
            case 'special':
                if (Math.random() < 0.7) {
                    playerDamage = Math.floor(battleState.player.attack * 1.5);
                    battleState.monster.health -= playerDamage;
                    resultMessage += `✨ Special attack hits for ${playerDamage} damage!\n`;
                } else {
                    resultMessage += `✨ Special attack missed!\n`;
                }
                break;
            
            case 'flee':
                interaction.client.activeBattles.delete(interaction.user.id);
                const fleeEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('🏃 You fled from battle!')
                    .setDescription('You escaped, but gained no rewards.')
                    .setTimestamp();
                
                await interaction.update({ embeds: [fleeEmbed], components: [] });
                return;
        }

        // Check if monster is defeated
        if (battleState.monster.health <= 0) {
            await this.endBattle(interaction, battleState, true);
            return;
        }

        // Monster's turn
        monsterDamage = Math.max(1, battleState.monster.attack - battleState.player.defense + Math.floor(Math.random() * 3));
        battleState.player.health -= monsterDamage;
        resultMessage += `${this.getMonsterEmoji(battleState.monster.name)} ${battleState.monster.name} attacks for ${monsterDamage} damage!`;

        // Reset temporary defense boost
        if (action === 'defend') {
            battleState.player.defense -= 2;
        }

        // Check if player is defeated
        if (battleState.player.health <= 0) {
            await this.endBattle(interaction, battleState, false);
            return;
        }

        // Continue battle
        battleState.round++;
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.battle)
            .setTitle('⚔️ Battle Continues!')
            .setDescription(resultMessage)
            .addFields([
                { 
                    name: '👤 You', 
                    value: `❤️ ${battleState.player.health}/${battleState.player.maxHealth}`, 
                    inline: true 
                },
                { 
                    name: `${this.getMonsterEmoji(battleState.monster.name)} ${battleState.monster.name}`, 
                    value: `❤️ ${battleState.monster.health}/${battleState.monster.maxHealth}`, 
                    inline: true 
                },
                { 
                    name: '🎯 Your Turn', 
                    value: 'What will you do next?', 
                    inline: false 
                }
            ])
            .setFooter({ text: `Round ${battleState.round}` })
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
                    .setLabel('Special Attack')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId(`battle_flee_${battleId}`)
                    .setLabel('Flee')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃')
            );

        await interaction.update({ embeds: [embed], components: [battleActions] });
    },

    async endBattle(interaction, battleState, playerWon) {
        const player = await db.getPlayer(interaction.user.id);
        interaction.client.activeBattles.delete(interaction.user.id);

        if (playerWon) {
            const reward = battleState.monster.reward;
            player.experience = (player.experience || 0) + reward.xp;
            player.coins = (player.coins || 0) + reward.gold;
            player.battleWins = (player.battleWins || 0) + 1;
            
            // Level up check
            const oldLevel = player.level || 1;
            const newLevel = Math.floor(player.experience / 1000) + 1;
            if (newLevel > oldLevel) {
                player.level = newLevel;
                player.maxHealth = 100 + (newLevel * 10);
                player.health = player.maxHealth;
                player.attack = 10 + (newLevel * 2);
                player.defense = 5 + newLevel;
            }
            
            await db.savePlayer(player);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('🏆 Victory!')
                .setDescription(`You defeated the **${battleState.monster.name}**!`)
                .addFields([
                    { name: '🌟 Experience Gained', value: `+${reward.xp} XP`, inline: true },
                    { name: '💰 Gold Earned', value: `+${reward.gold} ${config.emojis.coin}`, inline: true },
                    { name: '📊 Battle Stats', value: `Rounds: ${battleState.round}\nWins: ${player.battleWins}`, inline: true }
                ])
                .setFooter({ text: newLevel > oldLevel ? `🎉 Level Up! You are now level ${newLevel}!` : `Level ${player.level || 1} • ${player.experience} XP` })
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        } else {
            player.battleLosses = (player.battleLosses || 0) + 1;
            player.health = Math.max(1, Math.floor(player.maxHealth * 0.1));
            await db.savePlayer(player);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('💀 Defeat!')
                .setDescription(`You were defeated by the **${battleState.monster.name}**!`)
                .addFields([
                    { name: '🏥 Status', value: 'You barely survived with 1 HP', inline: true },
                    { name: '📊 Battle Stats', value: `Rounds: ${battleState.round}\nLosses: ${player.battleLosses}`, inline: true },
                    { name: '💡 Tip', value: 'Train more and get better equipment!', inline: true }
                ])
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
