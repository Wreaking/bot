const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Fishing skill tree and perks
const fishingSkills = {
    basic: {
        name: 'Basic Fishing',
        description: 'Fundamental fishing techniques',
        perks: [
            { level: 1, name: 'Fish Sense', description: '+5% catch rate', bonus: 0.05 },
            { level: 5, name: 'Quick Cast', description: '+10% fishing speed', bonus: 0.10 },
            { level: 10, name: 'Line Master', description: '+15% less line breaks', bonus: 0.15 }
        ]
    },
    advanced: {
        name: 'Advanced Techniques',
        description: 'Specialized fishing methods',
        perks: [
            { level: 15, name: 'Deep Fisher', description: 'Access to deep water fish', bonus: 0.20 },
            { level: 20, name: 'Weather Wisdom', description: 'Better catches in bad weather', bonus: 0.25 },
            { level: 25, name: 'Master Angler', description: '+25% rare fish chance', bonus: 0.25 }
        ]
    },
    expert: {
        name: 'Expert Mastery',
        description: 'Elite fishing abilities',
        perks: [
            { level: 30, name: 'Fish Whisperer', description: 'Locate legendary fish', bonus: 0.30 },
            { level: 35, name: 'Perfect Cast', description: '+35% critical catch rate', bonus: 0.35 },
            { level: 40, name: 'Ocean Master', description: 'Mastery over all waters', bonus: 0.40 }
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing')
        .setDescription('🎣 View and manage your fishing skills')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your fishing statistics and skills'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('perks')
                .setDescription('View available fishing perks'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mastery')
                .setDescription('Check your fishing mastery progress')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                fishingExp: 0,
                fishCaught: {
                    common: 0,
                    uncommon: 0,
                    rare: 0,
                    legendary: 0
                },
                unlockedPerks: []
            };

            if (subcommand === 'stats') {
                const totalFish = Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
                const nextLevel = Math.pow(player.fishingLevel, 2) * 100;

                const embed = new EmbedBuilder()
                    .setColor('#1E90FF')
                    .setTitle('🎣 Fishing Statistics')
                    .setDescription(`Level ${player.fishingLevel} Fisher`)
                    .addFields(
                        { name: 'Experience', value: `${player.fishingExp}/${nextLevel}`, inline: true },
                        { name: 'Total Catches', value: totalFish.toString(), inline: true },
                        { name: 'Active Perks', value: player.unlockedPerks.length > 0 
                            ? player.unlockedPerks.join(', ')
                            : 'None unlocked yet', inline: false },
                        { name: 'Catch Breakdown', value: 
                            `Common: ${player.fishCaught.common} 🐟\n` +
                            `Uncommon: ${player.fishCaught.uncommon} 🐠\n` +
                            `Rare: ${player.fishCaught.rare} 🦈\n` +
                            `Legendary: ${player.fishCaught.legendary} ✨`, inline: false }
                    );

                const progressBar = createProgressBar(player.fishingExp, nextLevel);
                embed.addFields({
                    name: 'Level Progress',
                    value: progressBar,
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'perks') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🎣 Fishing Perks')
                    .setDescription('Available fishing perks and bonuses');

                Object.entries(fishingSkills).forEach(([category, skills]) => {
                    const perkList = skills.perks.map(perk => {
                        const unlocked = player.fishingLevel >= perk.level;
                        const status = unlocked ? '✅' : '🔒';
                        return `${status} **Level ${perk.level} - ${perk.name}**\n╰ ${perk.description}`;
                    }).join('\n');

                    embed.addFields({
                        name: `📚 ${skills.name}`,
                        value: perkList,
                        inline: false
                    });
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'mastery') {
                const masteryLevels = {
                    novice: { threshold: 0, title: 'Novice Fisher', emoji: '🎣' },
                    apprentice: { threshold: 100, title: 'Apprentice Angler', emoji: '🐟' },
                    journeyman: { threshold: 500, title: 'Journeyman Fisher', emoji: '🐠' },
                    expert: { threshold: 2000, title: 'Expert Angler', emoji: '🦈' },
                    master: { threshold: 5000, title: 'Master of the Seas', emoji: '👑' }
                };

                const totalCatches = Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
                let currentMastery = 'novice';
                let nextMastery = 'apprentice';

                for (const [level, data] of Object.entries(masteryLevels)) {
                    if (totalCatches >= data.threshold) {
                        currentMastery = level;
                    } else {
                        nextMastery = level;
                        break;
                    }
                }

                const current = masteryLevels[currentMastery];
                const next = masteryLevels[nextMastery];
                const progress = totalCatches - current.threshold;
                const required = next.threshold - current.threshold;

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`${current.emoji} Fishing Mastery`)
                    .setDescription(`Current Title: ${current.title}`)
                    .addFields(
                        { name: 'Total Catches', value: totalCatches.toString(), inline: true },
                        { name: 'Current Rank', value: currentMastery.charAt(0).toUpperCase() + currentMastery.slice(1), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Progress to Next Rank', value: next 
                            ? `${progress}/${required} catches needed for ${next.title}`
                            : 'Maximum rank achieved!',
                            inline: false }
                    );

                if (next) {
                    const progressBar = createProgressBar(progress, required);
                    embed.addFields({
                        name: 'Rank Progress',
                        value: progressBar,
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in fishing command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while viewing fishing information.',
                ephemeral: true
            });
        }
    },
};

function createProgressBar(current, max) {
    const barLength = 20;
    const progress = Math.min(Math.max(0, current), max);
    const filledLength = Math.floor((progress / max) * barLength);
    const emptyLength = barLength - filledLength;
    
    return '🟦'.repeat(filledLength) + '⬜'.repeat(emptyLength) +
           ` ${current}/${max} (${Math.floor((current/max) * 100)}%)`;
}
