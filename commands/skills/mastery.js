
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('🎯 Master your skills and unlock powerful abilities')
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train a specific skill')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('Which skill to train')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚔️ Combat - Physical prowess and battle tactics', value: 'combat' },
                            { name: '🔨 Crafting - Create and enhance items', value: 'crafting' },
                            { name: '⛏️ Mining - Extract valuable resources', value: 'mining' },
                            { name: '🎣 Fishing - Master the art of angling', value: 'fishing' },
                            { name: '🌿 Foraging - Find rare herbs and materials', value: 'foraging' },
                            { name: '✨ Magic - Harness mystical energies', value: 'magic' },
                            { name: '🏃 Agility - Speed and dexterity training', value: 'agility' },
                            { name: '🧠 Intelligence - Mental acuity and wisdom', value: 'intelligence' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('View your skill levels and detailed progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('perks')
                .setDescription('View and unlock skill perks and abilities'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('specialization')
                .setDescription('Choose specializations for enhanced abilities'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mastery-challenge')
                .setDescription('Take on mastery challenges for bonus XP')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Initialize enhanced skills data
            if (!player.skills) {
                player.skills = this.getDefaultSkills();
            }

            switch (subcommand) {
                case 'train':
                    await this.handleTraining(interaction, player);
                    break;
                case 'progress':
                    await this.showProgress(interaction, player);
                    break;
                case 'perks':
                    await this.showPerks(interaction, player);
                    break;
                case 'specialization':
                    await this.showSpecializations(interaction, player);
                    break;
                case 'mastery-challenge':
                    await this.showMasteryChallenges(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in mastery command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing skills. Please try again.',
                ephemeral: true
            });
        }
    },

    async handleTraining(interaction, player) {
        const skill = interaction.options.getString('skill');
        const currentTime = Date.now();
        const trainingCooldown = 180000; // 3 minutes

        if (currentTime - (player.skills.lastTraining || 0) < trainingCooldown) {
            const remainingTime = Math.ceil((trainingCooldown - (currentTime - (player.skills.lastTraining || 0))) / 60000);
            await interaction.editReply({
                content: `⏳ You need to rest for ${remainingTime} more minutes before training again.\n💡 *Use this time to explore other features!*`,
                ephemeral: true
            });
            return;
        }

        const selectedSkill = player.skills[skill] || this.getDefaultSkill();
        const staminaCost = 25 + Math.floor(selectedSkill.level / 5) * 5;
        const goldCost = Math.floor(50 * Math.pow(1.3, selectedSkill.level - 1));

        if ((player.stamina || 100) < staminaCost) {
            await interaction.editReply({
                content: `❌ You need ${staminaCost} stamina to train ${skill}!\n💡 *Rest or use stamina potions to recover.*`,
                ephemeral: true
            });
            return;
        }

        if ((player.coins || 0) < goldCost) {
            await interaction.editReply({
                content: `❌ You need ${goldCost} coins to train ${skill}!\n💡 *Complete hunts or work to earn more coins.*`,
                ephemeral: true
            });
            return;
        }

        const trainingMethods = this.getTrainingMethods(skill, selectedSkill.level);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`🎯 ${this.getSkillEmoji(skill)} ${this.capitalize(skill)} Training`)
            .setDescription(`**Choose your training method**\n\nCurrent Level: **${selectedSkill.level}** (${selectedSkill.exp}/${selectedSkill.nextLevel} XP)`)
            .addFields([
                { 
                    name: '💰 Training Cost', 
                    value: `**Gold:** ${goldCost}\n**Stamina:** ${staminaCost}`, 
                    inline: true 
                },
                { 
                    name: '📈 Potential Gains', 
                    value: `**Base XP:** ${trainingMethods.normal.baseExp}\n**Bonus XP:** Up to ${trainingMethods.intense.baseExp}`, 
                    inline: true 
                },
                {
                    name: '🏆 Next Milestone',
                    value: `**Level ${selectedSkill.level + 1}:** ${this.getNextPerk(skill, selectedSkill.level + 1)}\n**Progress:** ${Math.floor((selectedSkill.exp / selectedSkill.nextLevel) * 100)}%`,
                    inline: false
                }
            ])
            .setFooter({ text: '💡 Higher intensity training has better rewards but higher failure risk!' });

        const methods = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('train_normal')
                    .setLabel('🎯 Normal Training')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('train_intense')
                    .setLabel('💪 Intense Training')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔥'),
                new ButtonBuilder()
                    .setCustomId('train_meditation')
                    .setLabel('🧘 Focused Meditation')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨')
            );

        const controls = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('train_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('train_auto')
                    .setLabel('🤖 Auto Train')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(selectedSkill.level < 5)
            );

        const response = await interaction.editReply({
            embeds: [embed],
            components: [methods, controls]
        });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('train_');
        
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 45000 });

            if (confirmation.customId === 'train_cancel') {
                await confirmation.update({
                    content: '❌ Training session cancelled.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Process training
            const methodKey = confirmation.customId.replace('train_', '');
            const result = await this.processTraining(player, skill, methodKey, goldCost, staminaCost);

            await confirmation.update({
                embeds: [result.embed],
                components: result.components || []
            });

            // Save progress
            await db.updatePlayer(interaction.user.id, player);

        } catch (e) {
            await interaction.editReply({
                content: '❌ Training session timed out. Please try again.',
                embeds: [],
                components: []
            });
        }
    },

    async processTraining(player, skill, method, goldCost, staminaCost) {
        const selectedSkill = player.skills[skill];
        const trainingMethods = this.getTrainingMethods(skill, selectedSkill.level);
        const methodData = trainingMethods[method] || trainingMethods.normal;

        // Deduct costs
        player.coins = (player.coins || 0) - goldCost;
        player.stamina = (player.stamina || 100) - staminaCost;
        player.skills.lastTraining = Date.now();

        // Calculate results
        const successRate = Math.random();
        let expGained, trainingResult, bonusReward = '';

        if (method === 'auto') {
            expGained = Math.floor(methodData.baseExp * 0.8); // 80% efficiency for auto
            trainingResult = '🤖 Auto-training completed efficiently.';
        } else if (successRate > methodData.criticalChance) {
            expGained = Math.floor(methodData.baseExp * methodData.criticalMultiplier);
            trainingResult = `${methodData.criticalText} (${methodData.criticalMultiplier}x exp)`;
            
            // Bonus rewards for critical success
            if (Math.random() > 0.8) {
                const bonusCoins = Math.floor(goldCost * 0.5);
                player.coins += bonusCoins;
                bonusReward = `\n💰 Bonus reward: ${bonusCoins} coins!`;
            }
        } else if (successRate > methodData.failChance) {
            expGained = methodData.baseExp;
            trainingResult = methodData.successText;
        } else {
            expGained = Math.floor(methodData.baseExp * 0.3);
            trainingResult = methodData.failText;
        }

        selectedSkill.exp += expGained;

        // Level up check
        let levelUpRewards = '';
        while (selectedSkill.exp >= selectedSkill.nextLevel) {
            selectedSkill.exp -= selectedSkill.nextLevel;
            selectedSkill.level += 1;
            selectedSkill.nextLevel = Math.floor(100 * Math.pow(1.5, selectedSkill.level - 1));
            
            const newPerk = this.getNextPerk(skill, selectedSkill.level);
            levelUpRewards += `\n🌟 **Level ${selectedSkill.level} reached!** Unlocked: ${newPerk}`;
            
            // Award level up bonuses
            const levelBonus = selectedSkill.level * 10;
            player.coins += levelBonus;
            levelUpRewards += `\n💰 Level bonus: ${levelBonus} coins`;
        }

        const embed = new EmbedBuilder()
            .setColor(expGained >= methodData.baseExp ? '#00FF00' : '#FFA500')
            .setTitle(`🎯 ${this.getSkillEmoji(skill)} Training Results`)
            .setDescription(`${trainingResult}${bonusReward}${levelUpRewards}`)
            .addFields([
                { name: 'Skill', value: this.capitalize(skill), inline: true },
                { name: 'Level', value: selectedSkill.level.toString(), inline: true },
                { name: 'Exp Gained', value: expGained.toString(), inline: true },
                { 
                    name: 'Progress', 
                    value: `${selectedSkill.exp}/${selectedSkill.nextLevel}\n${this.createProgressBar(selectedSkill.exp, selectedSkill.nextLevel)}`, 
                    inline: false 
                }
            ])
            .setFooter({ text: `Training efficiency: ${Math.floor((expGained / methodData.baseExp) * 100)}%` });

        const components = levelUpRewards ? [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('view_perks')
                    .setLabel('🌟 View New Perks')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('continue_training')
                    .setLabel('🔄 Continue Training')
                    .setStyle(ButtonStyle.Primary)
            )
        ] : undefined;

        return { embed, components };
    },

    async showProgress(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 Skill Mastery Progress')
            .setDescription('**Your journey to mastery**\nTrack your progress across all skills and specializations.')
            .setThumbnail(interaction.user.displayAvatarURL());

        let totalLevel = 0;
        let totalExp = 0;

        Object.entries(player.skills).forEach(([skill, data]) => {
            if (skill !== 'lastTraining' && skill !== 'specializations') {
                const progressBar = this.createProgressBar(data.exp, data.nextLevel);
                const masteryLevel = this.getMasteryLevel(data.level);
                const nextPerk = this.getNextPerk(skill, data.level + 1);
                
                embed.addFields({
                    name: `${this.getSkillEmoji(skill)} ${this.capitalize(skill)} ${masteryLevel}`,
                    value: `**Level ${data.level}** (${data.exp}/${data.nextLevel} exp)\n${progressBar}\n🎯 Next: ${nextPerk}`,
                    inline: true
                });
                
                totalLevel += data.level;
                totalExp += data.exp + (data.level - 1) * 100;
            }
        });

        const avgLevel = Math.floor(totalLevel / Object.keys(player.skills).length - 1);
        const masteryRank = this.getMasteryRank(totalLevel);

        embed.addFields([
            {
                name: '📈 Overall Progress',
                value: `**Total Skill Levels:** ${totalLevel}\n**Average Level:** ${avgLevel}\n**Total Experience:** ${totalExp.toLocaleString()}\n**Mastery Rank:** ${masteryRank}`,
                inline: false
            },
            {
                name: '🏆 Mastery Milestones',
                value: this.getMasteryMilestones(totalLevel),
                inline: false
            }
        ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('skill_calculator')
                    .setLabel('🧮 XP Calculator')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('skill_compare')
                    .setLabel('⚖️ Compare Skills')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('training_plan')
                    .setLabel('📋 Training Plan')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showPerks(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('✨ Skill Perks & Abilities')
            .setDescription('**Unlock powerful abilities as you master each skill**\nEach skill level grants unique perks and bonuses.');

        const skillSelect = new StringSelectMenuBuilder()
            .setCustomId('perk_skill_select')
            .setPlaceholder('🎯 Select a skill to view perks...')
            .addOptions([
                { label: '⚔️ Combat Perks', value: 'combat', description: 'Battle prowess and combat abilities' },
                { label: '🔨 Crafting Perks', value: 'crafting', description: 'Creation and enhancement bonuses' },
                { label: '⛏️ Mining Perks', value: 'mining', description: 'Resource extraction improvements' },
                { label: '🎣 Fishing Perks', value: 'fishing', description: 'Angling mastery and rare catches' },
                { label: '🌿 Foraging Perks', value: 'foraging', description: 'Nature gathering and herbalism' },
                { label: '✨ Magic Perks', value: 'magic', description: 'Mystical powers and enchantments' },
                { label: '🏃 Agility Perks', value: 'agility', description: 'Speed and dexterity bonuses' },
                { label: '🧠 Intelligence Perks', value: 'intelligence', description: 'Mental prowess and wisdom' }
            ]);

        // Show overview of all unlocked perks
        let unlockedPerks = 0;
        let totalPerks = 0;

        Object.entries(player.skills).forEach(([skill, data]) => {
            if (skill !== 'lastTraining' && skill !== 'specializations') {
                const skillPerks = this.getSkillPerks(skill);
                totalPerks += Object.keys(skillPerks).length;
                
                Object.entries(skillPerks).forEach(([level, perk]) => {
                    if (data.level >= parseInt(level)) {
                        unlockedPerks++;
                    }
                });
            }
        });

        embed.addFields([
            {
                name: '🎯 Perk Progress',
                value: `**Unlocked:** ${unlockedPerks}/${totalPerks}\n**Progress:** ${Math.floor((unlockedPerks / totalPerks) * 100)}%\n**Perk Points:** ${unlockedPerks * 2}`,
                inline: true
            },
            {
                name: '🌟 Latest Unlocks',
                value: this.getRecentPerks(player.skills),
                inline: true
            }
        ]);

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(skillSelect)]
        });
    },

    getDefaultSkills() {
        return {
            combat: { level: 1, exp: 0, nextLevel: 100 },
            crafting: { level: 1, exp: 0, nextLevel: 100 },
            mining: { level: 1, exp: 0, nextLevel: 100 },
            fishing: { level: 1, exp: 0, nextLevel: 100 },
            foraging: { level: 1, exp: 0, nextLevel: 100 },
            magic: { level: 1, exp: 0, nextLevel: 100 },
            agility: { level: 1, exp: 0, nextLevel: 100 },
            intelligence: { level: 1, exp: 0, nextLevel: 100 },
            lastTraining: 0,
            specializations: {}
        };
    },

    getDefaultSkill() {
        return { level: 1, exp: 0, nextLevel: 100 };
    },

    getTrainingMethods(skill, level) {
        const baseExp = Math.floor(25 * Math.pow(1.1, level));
        
        return {
            normal: {
                baseExp,
                successText: 'Training session completed successfully.',
                criticalChance: 0.8,
                criticalMultiplier: 1.5,
                criticalText: 'Excellent training session!',
                failChance: 0.1,
                failText: 'Training was disrupted, but you learned something.'
            },
            intense: {
                baseExp: Math.floor(baseExp * 1.5),
                successText: 'Intense training pushed your limits!',
                criticalChance: 0.7,
                criticalMultiplier: 2.0,
                criticalText: 'Perfect execution! Outstanding results!',
                failChance: 0.3,
                failText: 'The intensity was too much, but you gained some experience.'
            },
            meditation: {
                baseExp: Math.floor(baseExp * 0.8),
                successText: 'Focused meditation enhanced your understanding.',
                criticalChance: 0.9,
                criticalMultiplier: 1.8,
                criticalText: 'Deep meditation unlocked hidden insights!',
                failChance: 0.05,
                failText: 'Meditation was peaceful but yielded modest gains.'
            },
            auto: {
                baseExp: Math.floor(baseExp * 0.8),
                successText: 'Auto-training completed efficiently.',
                criticalChance: 0.85,
                criticalMultiplier: 1.2,
                criticalText: 'Auto-training exceeded expectations!',
                failChance: 0.05,
                failText: 'Auto-training experienced minor issues.'
            }
        };
    },

    getSkillEmoji(skill) {
        const emojis = {
            combat: '⚔️',
            crafting: '🔨',
            mining: '⛏️',
            fishing: '🎣',
            foraging: '🌿',
            magic: '✨',
            agility: '🏃',
            intelligence: '🧠'
        };
        return emojis[skill] || '🎯';
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    createProgressBar(current, max, length = 20) {
        const progress = Math.floor((current / max) * length);
        const bar = '█'.repeat(progress) + '░'.repeat(length - progress);
        const percentage = Math.floor((current / max) * 100);
        return `${bar} ${percentage}%`;
    },

    getNextPerk(skill, level) {
        const perks = this.getSkillPerks(skill);
        const nextPerkLevel = Object.keys(perks).find(l => parseInt(l) >= level);
        return nextPerkLevel ? perks[nextPerkLevel] : 'Max level reached!';
    },

    getSkillPerks(skill) {
        const perkTrees = {
            combat: {
                5: '🗡️ +10% weapon damage',
                10: '🛡️ +5% damage reduction',
                15: '⚔️ Unlock combo attacks',
                20: '💪 +15% critical hit chance',
                25: '🏆 Weapon mastery bonuses',
                30: '⚡ Lightning strike ability',
                40: '🔥 Berserker rage mode',
                50: '👑 Combat grandmaster'
            },
            crafting: {
                5: '⚒️ +10% crafting success rate',
                10: '📦 Craft multiple items at once',
                15: '🔨 -20% material costs',
                20: '✨ Chance to craft rare items',
                25: '🎯 Perfect quality crafting',
                30: '🌟 Legendary item crafting',
                40: '🔮 Enchanted item creation',
                50: '👑 Master artificer'
            },
            mining: {
                5: '⛏️ +15% mining yield',
                10: '💎 +25% rare gem chance',
                15: '🔍 Detect valuable ores',
                20: '⚡ +30% mining speed',
                25: '💰 Double ore rewards',
                30: '🌋 Access to deep mines',
                40: '💎 Legendary gem discovery',
                50: '👑 Mining tycoon'
            },
            fishing: {
                5: '🎣 +15% fishing success rate',
                10: '🐠 Better fish quality',
                15: '🌊 Find treasures while fishing',
                20: '🎮 Master fishing techniques',
                25: '🐉 Legendary fish encounters',
                30: '🏴‍☠️ Deep sea fishing',
                40: '🦈 Mythical creature fishing',
                50: '👑 Fishing legend'
            },
            foraging: {
                5: '🌿 +20% gathering yield',
                10: '🍄 Find rare herbs',
                15: '🌳 Multiple item gathering',
                20: '🔍 Track valuable resources',
                25: '🌸 Seasonal gathering bonuses',
                30: '🦋 Attract rare creatures',
                40: '🌺 Mystical plant discovery',
                50: '👑 Nature's guardian'
            },
            magic: {
                5: '✨ +15% spell power',
                10: '📚 Learn advanced spells',
                15: '🔮 -25% mana costs',
                20: '🌟 Dual casting ability',
                25: '⚡ Elemental mastery',
                30: '🎭 Illusion magic',
                40: '🌌 Reality manipulation',
                50: '👑 Archmage powers'
            },
            agility: {
                5: '🏃 +20% movement speed',
                10: '🎯 +15% dodge chance',
                15: '⚡ Lightning reflexes',
                20: '🎪 Acrobatic abilities',
                25: '👤 Shadow step technique',
                30: '🌪️ Whirlwind movement',
                40: '⏰ Time dilation',
                50: '👑 Speed demon'
            },
            intelligence: {
                5: '🧠 +10% XP gain',
                10: '📖 Faster skill learning',
                15: '🔍 Enhanced perception',
                20: '💡 Strategic thinking',
                25: '🎓 Wisdom bonuses',
                30: '🔮 Precognition abilities',
                40: '🌟 Enlightenment state',
                50: '👑 Sage of wisdom'
            }
        };
        
        return perkTrees[skill] || {};
    },

    getMasteryLevel(level) {
        if (level >= 50) return '👑 Grandmaster';
        if (level >= 40) return '🌟 Master';
        if (level >= 30) return '🏆 Expert';
        if (level >= 20) return '⭐ Advanced';
        if (level >= 10) return '🎯 Skilled';
        if (level >= 5) return '📈 Apprentice';
        return '🌱 Novice';
    },

    getMasteryRank(totalLevel) {
        if (totalLevel >= 400) return '👑 Legendary Master';
        if (totalLevel >= 300) return '🌟 Grand Master';
        if (totalLevel >= 200) return '🏆 Master Craftsman';
        if (totalLevel >= 150) return '⭐ Expert Adventurer';
        if (totalLevel >= 100) return '🎯 Skilled Practitioner';
        if (totalLevel >= 50) return '📈 Dedicated Student';
        return '🌱 Promising Beginner';
    },

    getMasteryMilestones(totalLevel) {
        const milestones = [
            { level: 50, reward: '🎁 Starter milestone reward' },
            { level: 100, reward: '💰 +1000 coins, skill point' },
            { level: 150, reward: '🎒 Expanded inventory' },
            { level: 200, reward: '⚡ +50 max stamina' },
            { level: 300, reward: '🏆 Master\'s equipment set' },
            { level: 400, reward: '👑 Legendary title and abilities' }
        ];

        return milestones.map(m => 
            `${totalLevel >= m.level ? '✅' : '❌'} Level ${m.level}: ${m.reward}`
        ).join('\n');
    },

    getRecentPerks(skills) {
        const recentPerks = [];
        Object.entries(skills).forEach(([skill, data]) => {
            if (skill !== 'lastTraining' && skill !== 'specializations' && data.level >= 5) {
                const latestPerk = Math.floor(data.level / 5) * 5;
                if (latestPerk <= data.level) {
                    recentPerks.push(`${this.getSkillEmoji(skill)} ${this.capitalize(skill)} Lv.${latestPerk}`);
                }
            }
        });
        
        return recentPerks.slice(-3).join('\n') || 'No perks unlocked yet';
    }
};
