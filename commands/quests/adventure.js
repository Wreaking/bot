const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('📜 Manage and undertake quests and adventures')
        .addSubcommand(subcommand =>
            subcommand
                .setName('board')
                .setDescription('View available quests'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a quest')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('The ID of the quest to accept')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('Check your active quests'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Complete a quest')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('The ID of the quest to complete')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize quest data if it doesn't exist
            if (!player.quests) {
                player.quests = {
                    active: [],
                    completed: [],
                    reputation: 0,
                    dailyQuests: 0,
                    lastQuestReset: 0
                };
            }

            // Reset daily quests at midnight
            const now = new Date();
            const lastReset = new Date(player.quests.lastQuestReset);
            if (now.getDate() !== lastReset.getDate()) {
                player.quests.dailyQuests = 0;
                player.quests.lastQuestReset = now.getTime();
            }

            const generateQuests = () => {
                const baseQuests = [
                    {
                        id: 'hunt_1',
                        title: 'Monster Hunter',
                        description: 'Defeat 5 monsters in the forest',
                        type: 'combat',
                        difficulty: 'easy',
                        rewards: { gold: 100, exp: 50 },
                        requirements: { level: 1 }
                    },
                    {
                        id: 'mine_1',
                        title: 'Precious Gems',
                        description: 'Mine 3 rare gems from the mountain',
                        type: 'mining',
                        difficulty: 'medium',
                        rewards: { gold: 200, exp: 100, items: ['gem_pouch'] },
                        requirements: { level: 5, 'skills.mining': 3 }
                    },
                    {
                        id: 'craft_1',
                        title: 'Master Craftsman',
                        description: 'Craft 3 quality items',
                        type: 'crafting',
                        difficulty: 'hard',
                        rewards: { gold: 300, exp: 150, items: ['rare_material'] },
                        requirements: { level: 10, 'skills.crafting': 5 }
                    }
                ];

                // Add dynamic quests based on player level and skills
                if (player.level >= 15) {
                    baseQuests.push({
                        id: 'dragon_1',
                        title: 'Dragon\'s Lair',
                        description: 'Investigate the dragon sightings in the mountains',
                        type: 'exploration',
                        difficulty: 'very_hard',
                        rewards: { gold: 500, exp: 300, items: ['dragon_scale'] },
                        requirements: { level: 15, 'skills.combat': 10 }
                    });
                }

                return baseQuests;
            };

            const checkRequirements = (quest) => {
                if (quest.requirements.level > player.level) return false;
                
                if (quest.requirements['skills.mining'] && 
                    (!player.skills?.mining || player.skills.mining.level < quest.requirements['skills.mining'])) {
                    return false;
                }

                if (quest.requirements['skills.crafting'] && 
                    (!player.skills?.crafting || player.skills.crafting.level < quest.requirements['skills.crafting'])) {
                    return false;
                }

                if (quest.requirements['skills.combat'] && 
                    (!player.skills?.combat || player.skills.combat.level < quest.requirements['skills.combat'])) {
                    return false;
                }

                return true;
            };

            if (subcommand === 'board') {
                const availableQuests = generateQuests()
                    .filter(quest => !player.quests.active.find(q => q.id === quest.id))
                    .filter(quest => !player.quests.completed.includes(quest.id))
                    .filter(quest => checkRequirements(quest));

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📜 Quest Board')
                    .setDescription('Available quests:');

                if (availableQuests.length === 0) {
                    embed.addFields({
                        name: 'No Quests Available',
                        value: 'Check back later or level up to unlock more quests!',
                        inline: false
                    });
                } else {
                    availableQuests.forEach(quest => {
                        let rewardsText = `Gold: ${quest.rewards.gold}\nExp: ${quest.rewards.exp}`;
                        if (quest.rewards.items) {
                            rewardsText += `\nItems: ${quest.rewards.items.join(', ')}`;
                        }

                        embed.addFields({
                            name: `${quest.title} (${quest.id})`,
                            value: `Type: ${quest.type}\nDifficulty: ${quest.difficulty}\n${quest.description}\n\nRewards:\n${rewardsText}`,
                            inline: false
                        });
                    });
                }

                embed.addFields({
                    name: 'Daily Quests',
                    value: `${player.quests.dailyQuests}/3 completed today`,
                    inline: true
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'accept') {
                const questId = interaction.options.getString('quest_id');
                const quest = generateQuests().find(q => q.id === questId);

                if (!quest) {
                    await interaction.editReply({
                        content: '❌ Invalid quest ID!',
                        ephemeral: true
                    });
                    return;
                }

                if (player.quests.active.length >= 3) {
                    await interaction.editReply({
                        content: '❌ You can only have 3 active quests at a time!',
                        ephemeral: true
                    });
                    return;
                }

                if (!checkRequirements(quest)) {
                    await interaction.editReply({
                        content: '❌ You don\'t meet the requirements for this quest!',
                        ephemeral: true
                    });
                    return;
                }

                if (player.quests.dailyQuests >= 3) {
                    await interaction.editReply({
                        content: '❌ You\'ve reached the daily quest limit! Check back tomorrow.',
                        ephemeral: true
                    });
                    return;
                }

                player.quests.active.push({
                    ...quest,
                    progress: 0,
                    started: Date.now()
                });

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('📜 Quest Accepted')
                    .setDescription(`You've accepted the quest: ${quest.title}`)
                    .addFields(
                        { name: 'Objective', value: quest.description, inline: false },
                        { name: 'Type', value: quest.type, inline: true },
                        { name: 'Difficulty', value: quest.difficulty, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'progress') {
                if (player.quests.active.length === 0) {
                    await interaction.editReply({
                        content: 'You have no active quests!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📜 Active Quests')
                    .setDescription('Your current quests:');

                player.quests.active.forEach(quest => {
                    let progressText = '';
                    if (quest.type === 'combat') {
                        progressText = `${quest.progress}/5 monsters defeated`;
                    } else if (quest.type === 'mining') {
                        progressText = `${quest.progress}/3 gems mined`;
                    } else if (quest.type === 'crafting') {
                        progressText = `${quest.progress}/3 items crafted`;
                    } else {
                        progressText = `${Math.floor((quest.progress || 0) * 100)}% complete`;
                    }

                    embed.addFields({
                        name: quest.title,
                        value: `${quest.description}\nProgress: ${progressText}\nStarted: <t:${Math.floor(quest.started / 1000)}:R>`,
                        inline: false
                    });
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'complete') {
                const questId = interaction.options.getString('quest_id');
                const questIndex = player.quests.active.findIndex(q => q.id === questId);

                if (questIndex === -1) {
                    await interaction.editReply({
                        content: '❌ You don\'t have this quest active!',
                        ephemeral: true
                    });
                    return;
                }

                const quest = player.quests.active[questIndex];

                // Check if quest is actually complete based on type
                let isComplete = false;
                if (quest.type === 'combat') {
                    isComplete = quest.progress >= 5;
                } else if (quest.type === 'mining' || quest.type === 'crafting') {
                    isComplete = quest.progress >= 3;
                } else {
                    isComplete = quest.progress >= 1;
                }

                if (!isComplete) {
                    await interaction.editReply({
                        content: '❌ This quest is not yet complete!',
                        ephemeral: true
                    });
                    return;
                }

                // Award rewards
                player.gold += quest.rewards.gold;
                player.experience += quest.rewards.exp;
                player.quests.reputation += 1;
                player.quests.dailyQuests += 1;

                if (quest.rewards.items) {
                    player.inventory = player.inventory || { items: [] };
                    quest.rewards.items.forEach(item => {
                        player.inventory.items.push(item);
                    });
                }

                // Remove from active and add to completed
                player.quests.active.splice(questIndex, 1);
                player.quests.completed.push(quest.id);

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Quest Complete!')
                    .setDescription(`Congratulations! You've completed: ${quest.title}`)
                    .addFields(
                        { name: 'Rewards Received', value: `Gold: ${quest.rewards.gold}\nExp: ${quest.rewards.exp}${quest.rewards.items ? '\nItems: ' + quest.rewards.items.join(', ') : ''}`, inline: false },
                        { name: 'Quest Reputation', value: player.quests.reputation.toString(), inline: true },
                        { name: 'Daily Quests', value: `${player.quests.dailyQuests}/3`, inline: true }
                    );

                if (player.quests.reputation % 5 === 0) {
                    embed.addFields({
                        name: '🌟 Milestone Reached!',
                        value: 'You\'ve reached a new quest reputation milestone!',
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in adventure command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing quests.',
                ephemeral: true
            });
        }
    },
};
