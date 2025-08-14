const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const Player = require('../../game/Player');

module.exports = {
    name: 'solve',
    description: 'Submit your answer for a treasure hunt clue',
    execute: async (message, args) => {
        try {
            if (!args.length) {
                return message.reply('Please provide your answer! Usage: `v!solve <your answer>`');
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
                if (!userData) {
                    userData = {
                        inventory: {
                            coins: 100,
                            xp: 0,
                            items: []
                        },
                        stats: {
                            huntsCompleted: 0,
                            treasuresFound: 0
                        }
                    };
                }

                const player = new Player(message.author.id, userData);
                const reward = currentClue.reward || 100;
                
                player.inventory.coins += reward;
                player.inventory.xp += 10;
                player.stats.treasuresFound = (player.stats.treasuresFound || 0) + 1;
                
                // Progress the hunt
                hunt.solvedClues.push(currentClue);
                
                if (hunt.remainingClues.length === 0) {
                    // Hunt completed
                    const bonusReward = Math.floor(Math.random() * 200) + 300;
                    player.inventory.coins += bonusReward;
                    player.stats.huntsCompleted = (player.stats.huntsCompleted || 0) + 1;
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎉 Treasure Hunt Completed!')
                        .setDescription('Congratulations! You\'ve found all the treasure!')
                        .addFields(
                            { name: '💰 Clue Reward', value: `${reward} coins`, inline: true },
                            { name: '🌟 Completion Bonus', value: `${bonusReward} coins`, inline: true },
                            { name: '✨ XP Gained', value: '10 XP', inline: true },
                            { name: '📈 Progress', value: `Hunts Completed: ${player.stats.huntsCompleted}\nTreasures Found: ${player.stats.treasuresFound}`, inline: false }
                        )
                        .setFooter({ text: 'Start a new hunt with v!hunt' });
                    
                    await db.deleteHunt(message.author.id);
                    await db.setUser(message.author.id, {
                        ...userData,
                        inventory: player.inventory,
                        stats: player.stats
                    });

                    return message.reply({ embeds: [embed] });
                }

                // Get next clue
                hunt.currentClue = hunt.remainingClues.shift();
                await db.setHunt(message.author.id, hunt);
                await db.setUser(message.author.id, {
                    ...userData,
                    inventory: player.inventory,
                    stats: player.stats
                });

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
            console.error('Solve command error:', error);
            return message.reply('There was an error processing your answer. Please try again.');
        }
    }
};
