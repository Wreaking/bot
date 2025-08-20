
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

const riddles = [
    {
        question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
        answer: "map",
        hint: "You use me to find your way around the world!",
        difficulty: "easy",
        reward: 50
    },
    {
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "Think about what happens when you walk!",
        difficulty: "easy", 
        reward: 50
    },
    {
        question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
        answer: "echo",
        hint: "You might hear me in mountains or caves!",
        difficulty: "medium",
        reward: 100
    },
    {
        question: "I am not alive, but I grow. I don't have lungs, but I need air. I don't have a mouth, but water kills me. What am I?",
        answer: "fire",
        hint: "I'm hot and bright, and I dance without music!",
        difficulty: "medium",
        reward: 100
    },
    {
        question: "I have keys but no locks. I have space but no room. You can enter, but can't go outside. What am I?",
        answer: "keyboard",
        hint: "You're probably looking at one right now!",
        difficulty: "hard",
        reward: 200
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('riddle')
        .setDescription('🧩 Challenge yourself with interactive riddles!')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose difficulty level')
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' },
                    { name: 'Random', value: 'random' }
                )
        ),

    async execute(interaction) {
        try {
            const difficulty = interaction.options.getString('difficulty') || 'random';
            await this.showRiddle(interaction, difficulty);
        } catch (error) {
            console.error('Riddle command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading the riddle.',
                ephemeral: true
            });
        }
    },

    async showRiddle(interaction, difficulty = 'random') {
        // Filter riddles by difficulty or pick random
        let availableRiddles = riddles;
        if (difficulty !== 'random') {
            availableRiddles = riddles.filter(r => r.difficulty === difficulty);
        }
        
        const selectedRiddle = availableRiddles[Math.floor(Math.random() * availableRiddles.length)];
        
        const difficultyEmoji = {
            easy: '🟢',
            medium: '🟡', 
            hard: '🔴'
        };

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.primary || '#7289da')
            .setTitle('🧩 Treasure Hunter Riddle')
            .setDescription(`**${difficultyEmoji[selectedRiddle.difficulty]} ${selectedRiddle.difficulty.toUpperCase()} DIFFICULTY**\n\n${selectedRiddle.question}`)
            .addFields([
                { name: '💰 Reward', value: `${selectedRiddle.reward} coins`, inline: true },
                { name: '🎯 Difficulty', value: selectedRiddle.difficulty, inline: true },
                { name: '💡 Status', value: 'Thinking...', inline: true }
            ])
            .setFooter({ text: 'Type your answer or use the buttons below!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`riddle_answer_${interaction.user.id}`)
                    .setLabel('📝 Submit Answer')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`riddle_hint_${interaction.user.id}`)
                    .setLabel('💡 Get Hint')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`riddle_skip_${interaction.user.id}`)
                    .setLabel('⏭️ Skip Riddle')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`riddle_new_${interaction.user.id}`)
                    .setLabel('🔄 New Riddle')
                    .setStyle(ButtonStyle.Success)
            );

        const difficultySelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`riddle_difficulty_${interaction.user.id}`)
                    .setPlaceholder('Choose difficulty for next riddle')
                    .addOptions([
                        {
                            label: 'Easy',
                            description: 'Simple riddles (50 coins)',
                            value: 'easy',
                            emoji: '🟢'
                        },
                        {
                            label: 'Medium', 
                            description: 'Moderate riddles (100 coins)',
                            value: 'medium',
                            emoji: '🟡'
                        },
                        {
                            label: 'Hard',
                            description: 'Challenging riddles (200 coins)',
                            value: 'hard', 
                            emoji: '🔴'
                        },
                        {
                            label: 'Random',
                            description: 'Surprise me!',
                            value: 'random',
                            emoji: '🎲'
                        }
                    ])
            );

        // Store riddle data for this user
        this.activeRiddles = this.activeRiddles || new Map();
        this.activeRiddles.set(interaction.user.id, {
            riddle: selectedRiddle,
            attempts: 0,
            hintUsed: false,
            startTime: Date.now()
        });

        const response = { embeds: [embed], components: [buttons, difficultySelect] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    },

    async checkAnswer(interaction, answer) {
        const riddleData = this.activeRiddles?.get(interaction.user.id);
        if (!riddleData) {
            await interaction.reply({
                content: '❌ No active riddle found! Use `/riddle` to start a new one.',
                ephemeral: true
            });
            return;
        }

        const { riddle } = riddleData;
        const userAnswer = answer.toLowerCase().trim();
        const correctAnswer = riddle.answer.toLowerCase();

        riddleData.attempts++;

        const isCorrect = userAnswer === correctAnswer || userAnswer.includes(correctAnswer);

        if (isCorrect) {
            // Calculate reward (reduced if hint was used)
            let reward = riddle.reward;
            if (riddleData.hintUsed) reward = Math.floor(reward * 0.7);

            const timeTaken = Math.floor((Date.now() - riddleData.startTime) / 1000);
            const timeBonus = timeTaken < 30 ? Math.floor(reward * 0.2) : 0;
            const totalReward = reward + timeBonus;

            // Update user coins
            try {
                const userData = await db.getPlayer(interaction.user.id);
                await db.updatePlayer(interaction.user.id, { 
                    coins: userData.coins + totalReward,
                    statistics: {
                        ...userData.statistics,
                        riddlesSolved: (userData.statistics?.riddlesSolved || 0) + 1
                    }
                });
            } catch (error) {
                console.error('Error updating user data:', error);
            }

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.success || '#00ff00')
                .setTitle('🎉 Correct Answer!')
                .setDescription(`**"${riddle.answer}"** is the correct answer!`)
                .addFields([
                    { name: '💰 Coins Earned', value: `${totalReward}`, inline: true },
                    { name: '🎯 Attempts', value: `${riddleData.attempts}`, inline: true },
                    { name: '⏱️ Time Taken', value: `${timeTaken}s`, inline: true },
                    { name: '💡 Hint Used', value: riddleData.hintUsed ? 'Yes (-30%)' : 'No', inline: true },
                    { name: '⚡ Time Bonus', value: timeBonus > 0 ? `+${timeBonus} coins` : 'None', inline: true },
                    { name: '🏆 Total Reward', value: `${totalReward} coins`, inline: true }
                ])
                .setTimestamp();

            const newRiddleButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`riddle_new_${interaction.user.id}`)
                        .setLabel('🧩 New Riddle')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`riddle_stats_${interaction.user.id}`)
                        .setLabel('📊 My Stats')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Clean up active riddle
            this.activeRiddles.delete(interaction.user.id);

            await interaction.update({ embeds: [embed], components: [newRiddleButton] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#ff0000')
                .setTitle('❌ Incorrect Answer')
                .setDescription(`"${answer}" is not the correct answer. Try again!`)
                .addFields([
                    { name: '🎯 Attempts', value: `${riddleData.attempts}`, inline: true },
                    { name: '💡 Need Help?', value: 'Click the hint button!', inline: true }
                ]);

            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    },

    // Button handlers
    buttonHandlers: {
        answer: async function(interaction) {
            const modal = new ModalBuilder()
                .setCustomId(`riddle_answer_modal_${interaction.user.id}`)
                .setTitle('Submit Your Answer');

            const answerInput = new TextInputBuilder()
                .setCustomId('riddle_answer_input')
                .setLabel('Your Answer')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Type your answer here...')
                .setRequired(true)
                .setMaxLength(100);

            const actionRow = new ActionRowBuilder().addComponents(answerInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        },

        hint: async function(interaction) {
            const riddleData = this.activeRiddles?.get(interaction.user.id);
            if (!riddleData) {
                await interaction.reply({
                    content: '❌ No active riddle found!',
                    ephemeral: true
                });
                return;
            }

            if (riddleData.hintUsed) {
                await interaction.reply({
                    content: `💡 **Hint:** ${riddleData.riddle.hint}\n\n*(You already used your hint for this riddle)*`,
                    ephemeral: true
                });
                return;
            }

            riddleData.hintUsed = true;

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.warning || '#ffaa00')
                .setTitle('💡 Hint Revealed!')
                .setDescription(riddleData.riddle.hint)
                .setFooter({ text: 'Note: Using hints reduces your reward by 30%' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        skip: async function(interaction) {
            const riddleData = this.activeRiddles?.get(interaction.user.id);
            if (!riddleData) {
                await interaction.reply({
                    content: '❌ No active riddle found!',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.warning || '#ffaa00')
                .setTitle('⏭️ Riddle Skipped')
                .setDescription(`The answer was: **${riddleData.riddle.answer}**`)
                .addFields([
                    { name: '💰 Missed Reward', value: `${riddleData.riddle.reward} coins`, inline: true },
                    { name: '🎯 Attempts Made', value: `${riddleData.attempts}`, inline: true }
                ]);

            const newRiddleButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`riddle_new_${interaction.user.id}`)
                        .setLabel('🧩 Try Another Riddle')
                        .setStyle(ButtonStyle.Primary)
                );

            this.activeRiddles.delete(interaction.user.id);
            await interaction.update({ embeds: [embed], components: [newRiddleButton] });
        },

        new: async function(interaction) {
            await this.showRiddle(interaction, 'random');
        },

        stats: async function(interaction) {
            try {
                const userData = await db.getPlayer(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#0099ff')
                    .setTitle('📊 Your Riddle Statistics')
                    .addFields([
                        { name: '🧩 Riddles Solved', value: `${userData.statistics?.riddlesSolved || 0}`, inline: true },
                        { name: '💰 Coins Earned', value: `${userData.statistics?.coinsFromRiddles || 0}`, inline: true },
                        { name: '🎯 Success Rate', value: '85%', inline: true }
                    ])
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error fetching riddle stats:', error);
                await interaction.reply({
                    content: '❌ Error fetching your stats.',
                    ephemeral: true
                });
            }
        }
    },

    // Modal handler for answer submission
    modalHandlers: {
        answer_modal: async function(interaction) {
            const answer = interaction.fields.getTextInputValue('riddle_answer_input');
            await interaction.deferUpdate();
            await this.checkAnswer(interaction, answer);
        }
    },

    // Select menu handler for difficulty
    selectMenuHandlers: {
        difficulty: async function(interaction) {
            const selectedDifficulty = interaction.values[0];
            await this.showRiddle(interaction, selectedDifficulty);
        }
    }
};
