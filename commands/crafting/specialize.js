const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Crafting specializations and their bonuses
const specializations = {
    weaponsmith: {
        name: 'Weaponsmith',
        emoji: '⚔️',
        description: 'Master of weapon crafting',
        bonuses: {
            weapons: 0.25, // 25% better weapon crafting
            durability: 0.15 // 15% more durability
        }
    },
    armorer: {
        name: 'Armorer',
        emoji: '🛡️',
        description: 'Expert in armor crafting',
        bonuses: {
            armor: 0.25, // 25% better armor crafting
            protection: 0.15 // 15% more protection
        }
    },
    jeweler: {
        name: 'Jeweler',
        emoji: '💎',
        description: 'Specialist in jewelry and accessories',
        bonuses: {
            accessories: 0.25, // 25% better accessory crafting
            value: 0.15 // 15% more valuable items
        }
    },
    artificer: {
        name: 'Artificer',
        emoji: '✨',
        description: 'Master of enchanted items',
        bonuses: {
            enchanting: 0.25, // 25% better enchanting
            magical: 0.15 // 15% stronger magical effects
        }
    }
};

const specializationLevels = {
    1: { title: 'Apprentice', bonus: 1.0 },
    2: { title: 'Journeyman', bonus: 1.1 },
    3: { title: 'Expert', bonus: 1.25 },
    4: { title: 'Master', bonus: 1.5 },
    5: { title: 'Grandmaster', bonus: 2.0 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('specialize')
        .setDescription('🎯 Choose or view your crafting specialization')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current specialization and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('choose')
                .setDescription('Choose a new specialization')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Specialization type')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚔️ Weaponsmith', value: 'weaponsmith' },
                            { name: '🛡️ Armorer', value: 'armorer' },
                            { name: '💎 Jeweler', value: 'jeweler' },
                            { name: '✨ Artificer', value: 'artificer' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('advance')
                .setDescription('Advance your specialization rank when ready')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                craftingLevel: 1,
                specialization: null,
                specializationLevel: 1,
                specializationExp: 0
            };

            if (subcommand === 'view') {
                if (!player.specialization) {
                    const embed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('🎯 Crafting Specialization')
                        .setDescription('You haven\'t chosen a specialization yet!')
                        .addFields({
                            name: '📋 Available Specializations',
                            value: Object.entries(specializations)
                                .map(([id, spec]) => `${spec.emoji} **${spec.name}**: ${spec.description}`)
                                .join('\n')
                        });

                    const chooseButton = new ButtonBuilder()
                        .setCustomId('choose_specialization')
                        .setLabel('Choose Specialization')
                        .setStyle(ButtonStyle.Primary);

                    const row = new ActionRowBuilder()
                        .addComponents(chooseButton);

                    await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });
                    return;
                }

                const spec = specializations[player.specialization];
                const level = specializationLevels[player.specializationLevel];
                const nextLevel = specializationLevels[player.specializationLevel + 1];

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`${spec.emoji} ${spec.name} - ${level.title}`)
                    .setDescription(spec.description)
                    .addFields(
                        { name: 'Rank', value: `${level.title} (Level ${player.specializationLevel})`, inline: true },
                        { name: 'Experience', value: `${player.specializationExp}/1000`, inline: true },
                        { name: 'Current Bonus', value: `${(level.bonus * 100 - 100).toFixed(0)}% increased effectiveness`, inline: true }
                    );

                if (nextLevel) {
                    embed.addFields({
                        name: 'Next Rank',
                        value: `${nextLevel.title} - ${(nextLevel.bonus * 100 - 100).toFixed(0)}% effectiveness`,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: '🌟 Maximum Rank',
                        value: 'You have reached the pinnacle of your specialization!',
                        inline: false
                    });
                }

                const progressBar = createProgressBar(player.specializationExp, 1000);
                embed.addFields({
                    name: 'Progress',
                    value: progressBar,
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'choose') {
                if (player.specialization) {
                    await interaction.editReply({
                        content: '❌ You already have a specialization! You cannot change it.',
                        ephemeral: true
                    });
                    return;
                }

                const type = interaction.options.getString('type');
                const spec = specializations[type];

                player.specialization = type;
                player.specializationLevel = 1;
                player.specializationExp = 0;

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle(`${spec.emoji} Specialization Chosen!`)
                    .setDescription(`You are now a ${specializationLevels[1].title} ${spec.name}!`)
                    .addFields(
                        { name: 'Bonuses', value: Object.entries(spec.bonuses)
                            .map(([stat, bonus]) => `${bonus * 100}% increased ${stat}`)
                            .join('\n'), inline: false },
                        { name: 'Next Steps', value: 'Craft items to gain experience and advance your specialization!', inline: false }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'advance') {
                if (!player.specialization) {
                    await interaction.editReply({
                        content: '❌ You need to choose a specialization first!',
                        ephemeral: true
                    });
                    return;
                }

                if (player.specializationExp < 1000) {
                    await interaction.editReply({
                        content: `❌ You need 1000 experience to advance. Current: ${player.specializationExp}`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.specializationLevel >= 5) {
                    await interaction.editReply({
                        content: '❌ You have already reached the maximum specialization level!',
                        ephemeral: true
                    });
                    return;
                }

                // Advance specialization
                player.specializationLevel += 1;
                player.specializationExp = 0;
                await db.updatePlayer(userId, player);

                const spec = specializations[player.specialization];
                const newLevel = specializationLevels[player.specializationLevel];

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🌟 Specialization Advanced!')
                    .setDescription(`Your ${spec.name} expertise has grown!`)
                    .addFields(
                        { name: 'New Rank', value: newLevel.title, inline: true },
                        { name: 'Level', value: player.specializationLevel.toString(), inline: true },
                        { name: 'Bonus', value: `${(newLevel.bonus * 100 - 100).toFixed(0)}% effectiveness`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in specialize command:', error);
            await interaction.editReply({
                content: '❌ An error occurred with the specialization command.',
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
    
    return '█'.repeat(filledLength) + '░'.repeat(emptyLength) + 
           ` ${current}/${max} (${Math.floor((current/max) * 100)}%)`;
}
