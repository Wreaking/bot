const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder 
} = require('discord.js');
const db = require('../../database');
const { generateHunt } = require('../../utils/clues');

module.exports = {
    name: 'hunt',
    description: 'Start a treasure hunt',
    async execute(message, args) {
        try {
            // Check if user already has an active hunt
            const existingHunt = await db.getHunt(message.author.id);
            if (existingHunt && existingHunt.active) {
                const embed = new EmbedBuilder()
                    .setColor('#FF9900')
                    .setTitle('🗺️ Active Hunt')
                    .setDescription('You already have an active treasure hunt!')
                    .addFields(
                        { 
                            name: '📜 Current Clue', 
                            value: existingHunt.currentClue.text 
                        },
                        {
                            name: '🔍 Progress',
                            value: `${existingHunt.solvedClues.length}/${existingHunt.totalClues} clues solved`
                        }
                    );

                // Create action row with buttons
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('hunt_hint')
                            .setLabel('Get Hint')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💡'),
                        new ButtonBuilder()
                            .setCustomId('hunt_skip')
                            .setLabel('Skip Clue')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏭️'),
                        new ButtonBuilder()
                            .setCustomId('hunt_end')
                            .setLabel('End Hunt')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🚫')
                    );

                return message.reply({ 
                    embeds: [embed],
                    components: [buttons]
                });
            }

            // Create difficulty selector
            const difficultySelect = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('hunt_difficulty')
                        .setPlaceholder('Select hunt difficulty')
                        .addOptions([
                            {
                                label: 'Easy',
                                description: 'Simple clues with good hints',
                                value: 'easy',
                                emoji: '😊'
                            },
                            {
                                label: 'Medium',
                                description: 'Moderate clues with limited hints',
                                value: 'medium',
                                emoji: '🤔'
                            },
                            {
                                label: 'Hard',
                                description: 'Challenging clues with minimal hints',
                                value: 'hard',
                                emoji: '😈'
                            }
                        ])
                );

            // Size selector
            const sizeSelect = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('hunt_size')
                        .setPlaceholder('Select hunt size')
                        .addOptions([
                            {
                                label: 'Small',
                                description: '3 clues',
                                value: '3',
                                emoji: '🐣'
                            },
                            {
                                label: 'Medium',
                                description: '5 clues',
                                value: '5',
                                emoji: '🐥'
                            },
                            {
                                label: 'Large',
                                description: '7 clues',
                                value: '7',
                                emoji: '🐔'
                            }
                        ])
                );

            const setupEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🗺️ Treasure Hunt Setup')
                .setDescription('Configure your treasure hunt:')
                .addFields(
                    { 
                        name: '📜 Step 1', 
                        value: 'Select the difficulty level' 
                    },
                    {
                        name: '📏 Step 2',
                        value: 'Choose the hunt size'
                    }
                )
                .setFooter({ text: 'You have 60 seconds to make your selections' });

            // Store temporary hunt setup data
            const setupData = {
                difficulty: null,
                size: null,
                userId: message.author.id,
                messageId: null
            };

            const setupMessage = await message.reply({ 
                embeds: [setupEmbed],
                components: [difficultySelect, sizeSelect]
            });

            // Store the message ID for interaction handling
            setupData.messageId = setupMessage.id;
            await db.setTempHuntSetup(message.author.id, setupData);

            // Create a collector for the selections
            const filter = i => i.user.id === message.author.id;
            const collector = setupMessage.createMessageComponentCollector({ 
                filter, 
                time: 60000 
            });

            collector.on('collect', async i => {
                const setupData = await db.getTempHuntSetup(i.user.id);

                if (i.customId === 'hunt_difficulty') {
                    setupData.difficulty = i.values[0];
                } else if (i.customId === 'hunt_size') {
                    setupData.size = parseInt(i.values[0]);
                }

                await db.setTempHuntSetup(i.user.id, setupData);

                // If both selections are made, start the hunt
                if (setupData.difficulty && setupData.size) {
                    const clues = generateHunt(setupData.difficulty, setupData.size);
                    
                    const hunt = {
                        active: true,
                        startTime: Date.now(),
                        difficulty: setupData.difficulty,
                        totalClues: setupData.size,
                        solvedClues: [],
                        currentClue: clues[0],
                        remainingClues: clues.slice(1),
                        hints: {
                            available: setupData.difficulty === 'easy' ? 3 : 
                                     setupData.difficulty === 'medium' ? 2 : 1,
                            used: 0
                        }
                    };

                    await db.setHunt(i.user.id, hunt);
                    await db.deleteTempHuntSetup(i.user.id);

                    const startEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🗺️ Treasure Hunt Started!')
                        .setDescription(`Difficulty: ${setupData.difficulty}\nTotal Clues: ${setupData.size}`)
                        .addFields(
                            { 
                                name: '📜 First Clue', 
                                value: hunt.currentClue.text 
                            },
                            {
                                name: '💡 Hints',
                                value: `You have ${hunt.hints.available} hints available`
                            }
                        )
                        .setFooter({ text: 'Use v!solve <answer> to submit your answer' });

                    // Add hint and skip buttons
                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('hunt_hint')
                                .setLabel(`Hint (${hunt.hints.available} left)`)
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💡'),
                            new ButtonBuilder()
                                .setCustomId('hunt_skip')
                                .setLabel('Skip Clue')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('⏭️')
                        );

                    await i.update({ 
                        embeds: [startEmbed],
                        components: [buttons]
                    });
                } else {
                    await i.deferUpdate();
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⏰ Setup Timeout')
                        .setDescription('Hunt setup has timed out. Please try again.');

                    await setupMessage.edit({ 
                        embeds: [timeoutEmbed],
                        components: [] 
                    });

                    await db.deleteTempHuntSetup(message.author.id);
                }
            });

        } catch (error) {
            console.error('Hunt command error:', error);
            return message.reply('There was an error starting the treasure hunt. Please try again.');
        }
    }
};
