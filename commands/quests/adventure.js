
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Enhanced quest system with dynamic generation
const questCategories = {
    exploration: {
        name: 'Exploration & Discovery',
        emoji: '🗺️',
        color: '#32CD32',
        description: 'Venture into unknown territories and discover hidden secrets'
    },
    combat: {
        name: 'Combat & Warfare',
        emoji: '⚔️',
        color: '#FF4500',
        description: 'Engage in battles and prove your combat prowess'
    },
    crafting: {
        name: 'Crafting & Creation',
        emoji: '🔨',
        color: '#4169E1',
        description: 'Master the arts of creation and item enhancement'
    },
    social: {
        name: 'Social & Diplomacy',
        emoji: '🤝',
        color: '#FFD700',
        description: 'Build relationships and influence the world around you'
    },
    mystery: {
        name: 'Mystery & Investigation',
        emoji: '🔍',
        color: '#8A2BE2',
        description: 'Solve puzzles and uncover hidden truths'
    }
};

const questTemplates = {
    exploration: [
        {
            id: 'mountain_expedition',
            title: 'Mountain Peak Expedition',
            description: 'Scale the treacherous Frosted Peaks and plant the guild banner at the summit',
            objectives: ['Reach the mountain base', 'Navigate through ice caves', 'Defeat the mountain guardian', 'Plant guild banner at summit'],
            type: 'exploration',
            difficulty: 'medium',
            estimatedTime: '2-3 hours',
            rewards: { gold: 500, exp: 300, items: ['Mountain Climber Badge', 'Frost Resistance Cloak'] },
            requirements: { level: 8, skills: { climbing: 3 } }
        },
        {
            id: 'ancient_ruins',
            title: 'Lost City Archaeological Survey',
            description: 'Explore the recently discovered ruins and document ancient artifacts',
            objectives: ['Map the outer ruins', 'Solve entrance puzzles', 'Document 5 artifacts', 'Escape the guardian spirits'],
            type: 'exploration',
            difficulty: 'hard',
            estimatedTime: '3-4 hours',
            rewards: { gold: 800, exp: 500, items: ['Ancient Map Fragment', 'Archaeologist Tools', 'Spirit Ward Amulet'] },
            requirements: { level: 12, skills: { archaeology: 5, puzzle_solving: 3 } }
        }
    ],
    combat: [
        {
            id: 'bandit_clearing',
            title: 'Bandit Camp Elimination',
            description: 'Clear out the bandit camp that has been terrorizing local merchants',
            objectives: ['Locate bandit hideout', 'Defeat 10 bandits', 'Defeat bandit leader', 'Rescue captured merchants'],
            type: 'combat',
            difficulty: 'easy',
            estimatedTime: '1-2 hours',
            rewards: { gold: 400, exp: 250, items: ['Bandit Hunter Title', 'Merchant Friendship Token'] },
            requirements: { level: 5, skills: { combat: 3 } }
        },
        {
            id: 'dragon_hunt',
            title: 'Elder Dragon Subjugation',
            description: 'Confront the ancient dragon terrorizing the countryside',
            objectives: ['Gather dragon intelligence', 'Acquire dragon-slaying equipment', 'Face the Elder Dragon', 'Claim dragon hoard'],
            type: 'combat',
            difficulty: 'legendary',
            estimatedTime: '4-6 hours',
            rewards: { gold: 2500, exp: 1500, items: ['Dragonslayer Title', 'Dragon Scale Armor', 'Dragon Heart Crystal'] },
            requirements: { level: 20, skills: { combat: 15, dragon_lore: 5 } }
        }
    ],
    crafting: [
        {
            id: 'master_weapon',
            title: 'Forge of the Master Smith',
            description: 'Create a legendary weapon using ancient smithing techniques',
            objectives: ['Gather rare materials', 'Study ancient techniques', 'Forge the weapon', 'Enchant with elemental power'],
            type: 'crafting',
            difficulty: 'hard',
            estimatedTime: '2-3 hours',
            rewards: { gold: 600, exp: 400, items: ['Master Smith Title', 'Legendary Weapon Blueprint', 'Enchanted Smithing Hammer'] },
            requirements: { level: 15, skills: { smithing: 10, enchanting: 5 } }
        }
    ],
    social: [
        {
            id: 'peace_negotiation',
            title: 'Diplomatic Peace Summit',
            description: 'Negotiate peace between two warring factions',
            objectives: ['Meet with faction leaders', 'Understand their grievances', 'Propose compromise solutions', 'Facilitate peace treaty'],
            type: 'social',
            difficulty: 'medium',
            estimatedTime: '1-2 hours',
            rewards: { gold: 450, exp: 350, items: ['Diplomat Title', 'Peace Medal', 'Faction Respect Tokens'] },
            requirements: { level: 10, skills: { diplomacy: 5, charisma: 3 } }
        }
    ],
    mystery: [
        {
            id: 'missing_merchant',
            title: 'The Case of the Missing Merchant',
            description: 'Investigate the mysterious disappearance of a wealthy merchant',
            objectives: ['Interview witnesses', 'Search for clues', 'Follow the trail', 'Confront the culprit'],
            type: 'mystery',
            difficulty: 'medium',
            estimatedTime: '2-3 hours',
            rewards: { gold: 550, exp: 300, items: ['Detective Badge', 'Magnifying Glass', 'Evidence Kit'] },
            requirements: { level: 7, skills: { investigation: 4, persuasion: 2 } }
        }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('📜 Embark on epic quests and adventures with dynamic storytelling')
        .addSubcommand(subcommand =>
            subcommand
                .setName('board')
                .setDescription('Browse available quests and adventures'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a quest or adventure')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('The ID of the quest to accept')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('Check your active adventures and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Complete an adventure objective')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('The ID of the quest to progress')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('journal')
                .setDescription('View your adventure journal and history')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId) || {
                level: 1,
                coins: 100,
                experience: 0,
                skills: {},
                inventory: { items: [] }
            };

            // Initialize quest data if it doesn't exist
            if (!player.quests) {
                player.quests = {
                    active: [],
                    completed: [],
                    reputation: {},
                    dailyQuests: 0,
                    lastQuestReset: 0,
                    journalEntries: [],
                    preferences: { difficulty: 'medium', category: 'all' }
                };
            }

            // Reset daily quests at midnight
            const now = new Date();
            const lastReset = new Date(player.quests.lastQuestReset);
            if (now.getDate() !== lastReset.getDate()) {
                player.quests.dailyQuests = 0;
                player.quests.lastQuestReset = now.getTime();
            }

            switch (subcommand) {
                case 'board':
                    await this.showQuestBoard(interaction, player);
                    break;
                case 'accept':
                    await this.acceptQuest(interaction, player);
                    break;
                case 'progress':
                    await this.showProgress(interaction, player);
                    break;
                case 'complete':
                    await this.completeObjective(interaction, player);
                    break;
                case 'journal':
                    await this.showJournal(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in adventure command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing your adventures.',
                ephemeral: true
            });
        }
    },

    async showQuestBoard(interaction, player) {
        const availableQuests = this.generateDynamicQuests(player);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📜 Grand Adventure Board')
            .setDescription('**Welcome to the Adventurer\'s Guild!** Choose your next epic journey from our curated selection of quests.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '🎯 Your Adventurer Profile',
                    value: `**Level:** ${player.level} ⭐\n**Active Quests:** ${player.quests.active.length}/5 📋\n**Completed:** ${player.quests.completed.length} ✅\n**Daily Progress:** ${player.quests.dailyQuests}/3 🌅`,
                    inline: true
                },
                {
                    name: '🏆 Guild Standing',
                    value: `**Total Reputation:** ${this.getTotalReputation(player.quests.reputation)} 🌟\n**Preferred Difficulty:** ${player.quests.preferences?.difficulty || 'medium'} ⚔️\n**Specialty:** ${this.getSpecialty(player)} 🎭\n**Rank:** ${this.getGuildRank(player)} 🏅`,
                    inline: true
                },
                {
                    name: '📊 Quest Categories',
                    value: Object.values(questCategories).map(cat => 
                        `${cat.emoji} **${cat.name}**`
                    ).join('\n'),
                    inline: true
                }
            ]);

        if (availableQuests.length === 0) {
            embed.addFields({
                name: '🌙 No Quests Available',
                value: 'Check back later, complete current quests, or level up to unlock more adventures!',
                inline: false
            });
        } else {
            // Group quests by category
            const questsByCategory = {};
            availableQuests.forEach(quest => {
                if (!questsByCategory[quest.type]) {
                    questsByCategory[quest.type] = [];
                }
                questsByCategory[quest.type].push(quest);
            });

            Object.entries(questsByCategory).forEach(([category, quests]) => {
                const categoryData = questCategories[category];
                if (categoryData && quests.length > 0) {
                    const questList = quests.slice(0, 2).map(quest => {
                        const difficultyEmoji = this.getDifficultyEmoji(quest.difficulty);
                        return `${difficultyEmoji} **${quest.title}** (${quest.id})\n${quest.description.substring(0, 60)}...\n🎁 ${quest.rewards.gold}💰 | ${quest.rewards.exp}⭐`;
                    }).join('\n\n');

                    embed.addFields({
                        name: `${categoryData.emoji} ${categoryData.name}`,
                        value: questList,
                        inline: false
                    });
                }
            });
        }

        // Create interactive components
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('quest_category_filter')
            .setPlaceholder('🎯 Filter by quest category...')
            .addOptions([
                { label: 'All Categories', value: 'all', emoji: '🌟' },
                ...Object.entries(questCategories).map(([id, cat]) => ({
                    label: cat.name,
                    value: id,
                    emoji: cat.emoji,
                    description: cat.description.substring(0, 100)
                }))
            ]);

        const row1 = new ActionRowBuilder().addComponents(categorySelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_board_refresh')
                    .setLabel('🔄 Refresh Board')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quest_preferences')
                    .setLabel('⚙️ Preferences')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('quest_daily_bonus')
                    .setLabel('🌅 Daily Bonus')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(player.quests.dailyQuests >= 3),
                new ButtonBuilder()
                    .setCustomId('quest_guild_info')
                    .setLabel('🏛️ Guild Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    },

    async acceptQuest(interaction, player) {
        const questId = interaction.options.getString('quest_id');
        const availableQuests = this.generateDynamicQuests(player);
        const quest = availableQuests.find(q => q.id === questId);

        if (!quest) {
            await interaction.editReply({
                content: '❌ Quest not found or no longer available!',
                ephemeral: true
            });
            return;
        }

        if (player.quests.active.length >= 5) {
            await interaction.editReply({
                content: '❌ You can only have 5 active quests at a time! Complete some quests first.',
                ephemeral: true
            });
            return;
        }

        if (!this.checkRequirements(quest, player)) {
            const reqText = this.formatRequirements(quest.requirements);
            await interaction.editReply({
                content: `❌ You don't meet the requirements for this quest!\n${reqText}`,
                ephemeral: true
            });
            return;
        }

        if (player.quests.dailyQuests >= 3 && quest.isDaily) {
            await interaction.editReply({
                content: '❌ You\'ve reached the daily quest limit! Check back tomorrow.',
                ephemeral: true
            });
            return;
        }

        // Add quest to active quests
        const activeQuest = {
            ...quest,
            progress: { currentObjective: 0, objectiveProgress: 0, started: Date.now() },
            journalEntries: [`Quest accepted: ${quest.title}`]
        };

        player.quests.active.push(activeQuest);
        
        // Initialize category reputation if needed
        if (!player.quests.reputation[quest.type]) {
            player.quests.reputation[quest.type] = 0;
        }

        await db.updatePlayer(interaction.user.id, player);

        const categoryData = questCategories[quest.type];
        const embed = new EmbedBuilder()
            .setColor(categoryData.color)
            .setTitle('📜 Quest Accepted!')
            .setDescription(`**${quest.title}** has been added to your active quests!`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { name: '📖 Objective', value: quest.description, inline: false },
                { name: '🎯 Current Task', value: quest.objectives[0], inline: true },
                { name: '⏱️ Estimated Time', value: quest.estimatedTime, inline: true },
                { name: '🏷️ Category', value: `${categoryData.emoji} ${categoryData.name}`, inline: true },
                { name: '🎁 Rewards Preview', value: `💰 ${quest.rewards.gold} gold\n⭐ ${quest.rewards.exp} experience\n🎁 ${quest.rewards.items.length} special items`, inline: false }
            ])
            .setFooter({ text: 'Use /adventure progress to track your journey!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_progress_view')
                    .setLabel('📋 View Progress')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quest_objectives_detail')
                    .setLabel('🎯 Objective Details')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('quest_board_return')
                    .setLabel('📜 Back to Board')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showProgress(interaction, player) {
        if (player.quests.active.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📋 Active Adventures')
                .setDescription('**No active quests found!** Visit the quest board to start your next adventure.')
                .addFields([
                    { name: '💡 Suggestion', value: 'Use `/adventure board` to browse available quests!', inline: false }
                ])
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 Your Active Adventures')
            .setDescription(`**Tracking ${player.quests.active.length} active quest${player.quests.active.length !== 1 ? 's' : ''}**`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

        player.quests.active.forEach((quest, index) => {
            const categoryData = questCategories[quest.type];
            const progressPercent = Math.floor((quest.progress.currentObjective / quest.objectives.length) * 100);
            const timeElapsed = Math.floor((Date.now() - quest.progress.started) / (1000 * 60));
            
            const currentObjective = quest.objectives[quest.progress.currentObjective] || 'Quest Complete - Ready to finish!';
            
            embed.addFields({
                name: `${categoryData.emoji} ${quest.title} (${quest.id})`,
                value: `**Progress:** ${progressPercent}% (${quest.progress.currentObjective}/${quest.objectives.length})\n` +
                       `**Current Objective:** ${currentObjective}\n` +
                       `**Time Active:** ${timeElapsed} minutes\n` +
                       `**Difficulty:** ${this.getDifficultyEmoji(quest.difficulty)} ${quest.difficulty}`,
                inline: false
            });
        });

        const questSelect = new StringSelectMenuBuilder()
            .setCustomId('quest_progress_select')
            .setPlaceholder('📋 Select a quest to view details...')
            .addOptions(
                player.quests.active.map(quest => ({
                    label: quest.title,
                    description: `${quest.type} • ${Math.floor((quest.progress.currentObjective / quest.objectives.length) * 100)}% complete`,
                    value: `quest_detail_${quest.id}`,
                    emoji: questCategories[quest.type].emoji
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(questSelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_progress_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quest_abandon_menu')
                    .setLabel('🗑️ Abandon Quest')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('quest_journal_view')
                    .setLabel('📖 View Journal')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    },

    generateDynamicQuests(player) {
        const quests = [];
        const playerLevel = player.level || 1;
        
        // Generate quests based on player level and completed quests
        Object.entries(questTemplates).forEach(([category, categoryQuests]) => {
            categoryQuests.forEach(template => {
                // Check if quest is appropriate for player level
                if (this.checkRequirements(template, player)) {
                    // Don't show if already completed recently
                    const recentlyCompleted = player.quests.completed.some(
                        completedId => completedId.includes(template.id) && 
                        Date.now() - parseInt(completedId.split('_')[1] || 0) < 86400000 // 24 hours
                    );
                    
                    if (!recentlyCompleted) {
                        quests.push({
                            ...template,
                            id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                        });
                    }
                }
            });
        });

        // Add some daily quests
        if (player.quests.dailyQuests < 3) {
            quests.push(...this.generateDailyQuests(player));
        }

        return quests.sort((a, b) => {
            const difficultyOrder = { easy: 1, medium: 2, hard: 3, legendary: 4 };
            return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        });
    },

    generateDailyQuests(player) {
        const dailyQuests = [
            {
                id: `daily_combat_${Date.now()}`,
                title: 'Daily Monster Hunt',
                description: 'Defeat 5 monsters to hone your combat skills',
                objectives: ['Defeat 5 monsters of any type'],
                type: 'combat',
                difficulty: 'easy',
                estimatedTime: '30 minutes',
                rewards: { gold: 200, exp: 100, items: ['Combat Experience Token'] },
                requirements: { level: 1 },
                isDaily: true
            },
            {
                id: `daily_gather_${Date.now()}`,
                title: 'Resource Gathering',
                description: 'Collect various resources for the guild',
                objectives: ['Gather 10 basic resources'],
                type: 'exploration',
                difficulty: 'easy',
                estimatedTime: '20 minutes',
                rewards: { gold: 150, exp: 75, items: ['Resource Pouch'] },
                requirements: { level: 1 },
                isDaily: true
            }
        ];

        return dailyQuests.filter(quest => this.checkRequirements(quest, player));
    },

    checkRequirements(quest, player) {
        if (quest.requirements.level > (player.level || 1)) return false;
        
        if (quest.requirements.skills) {
            for (const [skill, required] of Object.entries(quest.requirements.skills)) {
                const playerSkillLevel = player.skills?.[skill]?.level || 0;
                if (playerSkillLevel < required) return false;
            }
        }
        
        return true;
    },

    formatRequirements(requirements) {
        let reqText = `**Level ${requirements.level}** required`;
        
        if (requirements.skills) {
            const skillReqs = Object.entries(requirements.skills)
                .map(([skill, level]) => `${skill}: ${level}`)
                .join(', ');
            reqText += `\n**Skills:** ${skillReqs}`;
        }
        
        return reqText;
    },

    getDifficultyEmoji(difficulty) {
        const emojis = {
            easy: '🟢',
            medium: '🟡', 
            hard: '🔴',
            legendary: '🟣'
        };
        return emojis[difficulty] || '⚪';
    },

    getTotalReputation(reputation) {
        return Object.values(reputation).reduce((sum, rep) => sum + rep, 0);
    },

    getSpecialty(player) {
        if (!player.quests.reputation) return 'Novice';
        
        const topCategory = Object.entries(player.quests.reputation)
            .sort(([,a], [,b]) => b - a)[0];
        
        return topCategory ? questCategories[topCategory[0]]?.name || 'Adventurer' : 'Novice';
    },

    getGuildRank(player) {
        const totalRep = this.getTotalReputation(player.quests.reputation || {});
        const completed = player.quests.completed.length;
        
        if (totalRep >= 1000 && completed >= 50) return 'Grandmaster';
        if (totalRep >= 500 && completed >= 25) return 'Master';
        if (totalRep >= 200 && completed >= 10) return 'Expert';
        if (totalRep >= 50 && completed >= 5) return 'Journeyman';
        return 'Apprentice';
    }
};
