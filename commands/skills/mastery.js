const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('🎯 Train and level up your skills')
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train a specific skill')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('Which skill to train')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Combat', value: 'combat' },
                            { name: 'Crafting', value: 'crafting' },
                            { name: 'Mining', value: 'mining' },
                            { name: 'Fishing', value: 'fishing' },
                            { name: 'Foraging', value: 'foraging' },
                            { name: 'Magic', value: 'magic' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('View your skill levels and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('perks')
                .setDescription('View available perks for your skills')),

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

            // Initialize skills data if it doesn't exist
            if (!player.skills) {
                player.skills = {
                    combat: { level: 1, exp: 0, nextLevel: 100 },
                    crafting: { level: 1, exp: 0, nextLevel: 100 },
                    mining: { level: 1, exp: 0, nextLevel: 100 },
                    fishing: { level: 1, exp: 0, nextLevel: 100 },
                    foraging: { level: 1, exp: 0, nextLevel: 100 },
                    magic: { level: 1, exp: 0, nextLevel: 100 },
                    lastTraining: 0
                };
            }

            if (subcommand === 'train') {
                const skill = interaction.options.getString('skill');
                const currentTime = Date.now();
                const trainingCooldown = 300000; // 5 minutes

                if (currentTime - player.skills.lastTraining < trainingCooldown) {
                    const remainingTime = Math.ceil((trainingCooldown - (currentTime - player.skills.lastTraining)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You need to rest for ${remainingTime} more minutes before training again.`,
                        ephemeral: true
                    });
                    return;
                }

                const staminaCost = 20;
                if (player.stamina < staminaCost) {
                    await interaction.editReply({
                        content: `❌ You need ${staminaCost} stamina to train!`,
                        ephemeral: true
                    });
                    return;
                }

                const selectedSkill = player.skills[skill];
                const baseExp = Math.floor(20 * Math.pow(1.1, selectedSkill.level));
                const requiredGold = Math.floor(10 * Math.pow(1.2, selectedSkill.level));

                if (player.gold < requiredGold) {
                    await interaction.editReply({
                        content: `❌ You need ${requiredGold} gold to train ${skill}!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🎯 Skill Training')
                    .setDescription(`Train your ${skill} skill?`)
                    .addFields(
                        { name: 'Current Level', value: selectedSkill.level.toString(), inline: true },
                        { name: 'Gold Cost', value: requiredGold.toString(), inline: true },
                        { name: 'Stamina Cost', value: staminaCost.toString(), inline: true },
                        { name: 'Potential Exp', value: `${baseExp}-${baseExp * 2}`, inline: true }
                    );

                const train = new ButtonBuilder()
                    .setCustomId('train_confirm')
                    .setLabel('Start Training')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯');

                const cancel = new ButtonBuilder()
                    .setCustomId('train_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(train, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'train_confirm') {
                        player.gold -= requiredGold;
                        player.stamina -= staminaCost;
                        player.skills.lastTraining = currentTime;

                        // Calculate training results
                        const successRate = Math.random();
                        let expGained;
                        let trainingResult;

                        if (successRate > 0.95) {
                            expGained = Math.floor(baseExp * 2); // Critical success
                            trainingResult = 'Perfect training session! (2x exp)';
                        } else if (successRate > 0.7) {
                            expGained = Math.floor(baseExp * 1.5); // Good success
                            trainingResult = 'Great training session! (1.5x exp)';
                        } else {
                            expGained = baseExp; // Normal success
                            trainingResult = 'Training completed successfully.';
                        }

                        selectedSkill.exp += expGained;

                        // Level up check
                        while (selectedSkill.exp >= selectedSkill.nextLevel) {
                            selectedSkill.exp -= selectedSkill.nextLevel;
                            selectedSkill.level += 1;
                            selectedSkill.nextLevel = Math.floor(100 * Math.pow(1.5, selectedSkill.level - 1));
                            
                            // Unlock perks at certain levels
                            if (selectedSkill.level % 5 === 0) {
                                trainingResult += `\n🌟 Level ${selectedSkill.level} reached! New perk unlocked!`;
                            }
                        }

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🎯 Training Results')
                            .setDescription(trainingResult)
                            .addFields(
                                { name: 'Skill', value: skill, inline: true },
                                { name: 'Level', value: selectedSkill.level.toString(), inline: true },
                                { name: 'Exp Gained', value: expGained.toString(), inline: true },
                                { name: 'Progress', value: `${selectedSkill.exp}/${selectedSkill.nextLevel}`, inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Training cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Training session expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'progress') {
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📊 Skill Progress')
                    .setDescription('Your current skill levels:');

                Object.entries(player.skills).forEach(([skill, data]) => {
                    if (skill !== 'lastTraining') {
                        const progressBar = createProgressBar(data.exp, data.nextLevel);
                        embed.addFields({
                            name: `${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
                            value: `Level ${data.level}\n${progressBar}\n${data.exp}/${data.nextLevel} exp`,
                            inline: true
                        });
                    }
                });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'perks') {
                const perks = {
                    combat: {
                        5: '🗡️ +10% damage with weapons',
                        10: '🛡️ +5% damage reduction',
                        15: '⚔️ Unlock special attacks',
                        20: '💪 +20% critical hit chance'
                    },
                    crafting: {
                        5: '⚒️ +10% crafting success rate',
                        10: '📦 Craft multiple items at once',
                        15: '🔨 Reduced material costs',
                        20: '✨ Chance to craft rare items'
                    },
                    mining: {
                        5: '⛏️ +10% mining yield',
                        10: '💎 Increased rare gem chance',
                        15: '🔍 Detect valuable ores',
                        20: '⚡ Faster mining speed'
                    },
                    fishing: {
                        5: '🎣 +10% fishing success rate',
                        10: '🐠 Better fish quality',
                        15: '🌊 Find special items while fishing',
                        20: '🎮 Advanced fishing minigame'
                    },
                    foraging: {
                        5: '🌿 +10% gathering yield',
                        10: '🍄 Find rare herbs',
                        15: '🌳 Multiple item gathering',
                        20: '🔍 Track valuable resources'
                    },
                    magic: {
                        5: '✨ +10% spell power',
                        10: '📚 Learn advanced spells',
                        15: '🔮 Reduced mana costs',
                        20: '🌟 Dual casting ability'
                    }
                };

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('✨ Skill Perks')
                    .setDescription('Available perks for each skill level:');

                Object.entries(player.skills).forEach(([skill, data]) => {
                    if (skill !== 'lastTraining') {
                        let perkText = '';
                        Object.entries(perks[skill]).forEach(([level, perk]) => {
                            perkText += `${level <= data.level ? '✅' : '❌'} Level ${level}: ${perk}\n`;
                        });
                        
                        embed.addFields({
                            name: `${skill.charAt(0).toUpperCase() + skill.slice(1)} (Level ${data.level})`,
                            value: perkText,
                            inline: false
                        });
                    }
                });

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in mastery command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing skills.',
                ephemeral: true
            });
        }
    },
};

function createProgressBar(current, max, length = 20) {
    const progress = Math.floor((current / max) * length);
    const bar = '█'.repeat(progress) + '░'.repeat(length - progress);
    return bar;
}
