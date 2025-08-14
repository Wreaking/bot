const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'answer',
    description: 'Answer a clue in your current treasure hunt',
    execute: async (message, args) => {
        try {
            if (!args.length) {
                return message.reply('Please provide an answer! Usage: `v!answer <your answer>`');
            }

            // Get current hunt
            const hunt = await db.getHunt(message.author.id);
            if (!hunt || !hunt.active) {
                return message.reply('You don\'t have an active treasure hunt! Start one with `v!hunt`');
            }

            const userAnswer = args.join(' ').toLowerCase().trim();
            const currentClue = hunt.currentClue;
            
            if (userAnswer === currentClue.answer.toLowerCase()) {
                // Update user data
                let userData = await db.getUser(message.author.id);
                const reward = currentClue.reward || 100;
                
                userData.inventory.coins += reward;
                userData.inventory.xp = (userData.inventory.xp || 0) + 10;
                
                // Progress the hunt
                hunt.solvedClues.push(currentClue);
                
                if (hunt.solvedClues.length >= hunt.totalClues) {
                    // Hunt completed
                    const bonusReward = Math.floor(Math.random() * 200) + 300;
                    userData.inventory.coins += bonusReward;
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎉 Treasure Hunt Completed!')
                        .setDescription(`Congratulations! You've found all the treasure!`)
                        .addFields(
                            { name: '💰 Clue Reward', value: `${reward} coins`, inline: true },
                            { name: '🌟 Completion Bonus', value: `${bonusReward} coins`, inline: true },
                            { name: '✨ XP Gained', value: '10 XP', inline: true }
                        )
                        .setFooter({ text: 'Start a new hunt with v!hunt' });
                    
                    await db.deleteHunt(message.author.id);
                    await db.setUser(message.author.id, userData);
                    return message.reply({ embeds: [embed] });
                }

                // Get next clue
                hunt.currentClue = hunt.remainingClues.shift();
                await db.setHunt(message.author.id, hunt);
                await db.setUser(message.author.id, userData);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Correct Answer!')
                    .setDescription('You solved the clue!')
                    .addFields(
                        { name: '💰 Reward', value: `${reward} coins`, inline: true },
                        { name: '✨ XP Gained', value: '10 XP', inline: true },
                        { name: '📜 Next Clue', value: hunt.currentClue.text }
                    )
                    .setFooter({ text: `Clues solved: ${hunt.solvedClues.length}/${hunt.totalClues}` });

                return message.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Wrong Answer')
                    .setDescription('That\'s not correct. Try again!')
                    .addFields(
                        { name: '🤔 Hint', value: currentClue.hint || 'No hint available' }
                    )
                    .setFooter({ text: 'Use v!solve <answer> to try again' });

                return message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in answer command:', error);
            return message.reply('There was an error processing your answer. Please try again.');
        }
    }
};
