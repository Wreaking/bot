const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('📜 Accept and manage treasure hunting quests'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            activeQuests: [],
            completedQuests: 0
        };

        const availableQuests = [
            {
                name: 'The Lost Amulet',
                difficulty: 'Easy',
                reward: '150 coins, +50 XP',
                description: 'Find the ancient amulet hidden in the Mystic Forest',
                requirements: 'Level 1+',
                duration: '30 minutes'
            },
            {
                name: 'Dragon\'s Hoard Mystery',
                difficulty: 'Medium',
                reward: '300 coins, +100 XP, Rare Item',
                description: 'Investigate the missing treasures from the dragon\'s lair',
                requirements: 'Level 5+',
                duration: '1 hour'
            },
            {
                name: 'The Sunken Temple',
                difficulty: 'Hard',
                reward: '500 coins, +200 XP, Epic Artifact',
                description: 'Explore the underwater ruins and recover ancient artifacts',
                requirements: 'Level 10+',
                duration: '2 hours'
            },
            {
                name: 'The Phantom Collector',
                difficulty: 'Legendary',
                reward: '1000 coins, +500 XP, Legendary Item',
                description: 'Stop the ghost who steals treasures from other hunters',
                requirements: 'Level 15+',
                duration: '3 hours'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('📜 Quest Board')
            .setDescription('**Treasure Hunter\'s Guild Assignments**\n\nAccept quests to earn rewards and gain reputation!')
            .addFields(
                { name: '⭐ Your Level', value: `${userProfile.level || 1}`, inline: true },
                { name: '🎯 Active Quests', value: `${userProfile.activeQuests?.length || 0}/3`, inline: true },
                { name: '✅ Completed Quests', value: `${userProfile.completedQuests || 0}`, inline: true }
            );

        availableQuests.forEach((quest, index) => {
            const difficultyEmoji = {
                'Easy': '🟢',
                'Medium': '🟡',
                'Hard': '🔴',
                'Legendary': '🟣'
            };

            embed.addFields({
                name: `${difficultyEmoji[quest.difficulty]} ${quest.name}`,
                value: `**Difficulty:** ${quest.difficulty}\n**Reward:** ${quest.reward}\n**Duration:** ${quest.duration}\n**Requirements:** ${quest.requirements}`,
                inline: true
            });
        });

        const questButtons = availableQuests.map((quest, index) => 
            new ButtonBuilder()
                .setCustomId(`quest_accept_${index}`)
                .setLabel(`Accept ${quest.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📜')
        );

        const manageButton = new ButtonBuilder()
            .setCustomId('quest_manage')
            .setLabel('Manage Active Quests')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

        const abandonButton = new ButtonBuilder()
            .setCustomId('quest_abandon')
            .setLabel('Abandon Quest')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const row1 = new ActionRowBuilder().addComponents(questButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(questButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(manageButton, abandonButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};