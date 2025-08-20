const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('riddle')
        .setDescription('🧩 Solve riddles to unlock treasure locations'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            riddlesSolved: 0
        };

        const riddles = [
            {
                question: "I have keys but no locks. I have space but no room. You can enter, but can't go inside. What am I?",
                answer: "keyboard",
                hint: "You use me to type messages...",
                reward: 100,
                difficulty: "Easy"
            },
            {
                question: "The more you take away from me, the bigger I become. What am I?",
                answer: "hole",
                hint: "Digging makes me larger...",
                reward: 150,
                difficulty: "Medium"
            },
            {
                question: "I speak without a mouth and hear without ears. I have no body, but come alive with the wind. What am I?",
                answer: "echo",
                hint: "I repeat what you say...",
                reward: 200,
                difficulty: "Hard"
            },
            {
                question: "Born in darkness, I fear the light. I'm found in caves but never in sight. Dragons guard me, thieves desire me. What am I?",
                answer: "treasure",
                hint: "The very thing you seek...",
                reward: 300,
                difficulty: "Legendary"
            }
        ];

        const currentRiddle = riddles[Math.floor(Math.random() * riddles.length)];
        
        // Store the current riddle for this user
        await db.set(`riddle_${userId}`, {
            ...currentRiddle,
            timestamp: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('🧩 The Ancient Oracle')
            .setDescription('**"Solve my riddle, and treasure shall be yours..."**\n\nAnswer correctly to unlock hidden rewards!')
            .addFields(
                { name: '🎭 Your Record', value: `${userProfile.riddlesSolved || 0} riddles solved`, inline: true },
                { name: '⭐ Difficulty', value: currentRiddle.difficulty, inline: true },
                { name: '💰 Reward', value: `${currentRiddle.reward} coins + XP`, inline: true },
                {
                    name: '🔮 The Riddle',
                    value: `*"${currentRiddle.question}"*`,
                    inline: false
                }
            );

        const answerButton = new ButtonBuilder()
            .setCustomId('riddle_answer')
            .setLabel('Submit Answer')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💭');

        const hintButton = new ButtonBuilder()
            .setCustomId('riddle_hint')
            .setLabel('Get Hint (-50% reward)')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💡');

        const skipButton = new ButtonBuilder()
            .setCustomId('riddle_skip')
            .setLabel('Skip Riddle')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏭️');

        const newRiddleButton = new ButtonBuilder()
            .setCustomId('riddle_new')
            .setLabel('New Riddle')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔄');

        const row1 = new ActionRowBuilder().addComponents(answerButton, hintButton);
        const row2 = new ActionRowBuilder().addComponents(skipButton, newRiddleButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};