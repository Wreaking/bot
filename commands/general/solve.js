const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solve')
        .setDescription('🎯 Submit your answer to the current treasure hunt riddle!')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the riddle')
                .setRequired(true)),
    
    async execute(interaction) {
        const answer = interaction.options.getString('answer').toLowerCase().trim();
        const userId = interaction.user.id;
        
        // Check if user has an active hunt
        if (!interaction.client.activeHunts.has(userId)) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ No Active Hunt')
                .setDescription('You don\'t have any active treasure hunts! Start one with `/hunt`.')
                .setFooter({ text: 'Use /hunt to begin your adventure!' });
                
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const hunt = interaction.client.activeHunts.get(userId);
        hunt.attempts++;
        
        // Check if answer is correct
        if (answer === hunt.answer || answer.includes(hunt.answer) || hunt.answer.includes(answer)) {
            // Correct answer - reward player
            interaction.client.activeHunts.delete(userId);
            
            // Get user data and add reward
            const userData = await db.getUser(userId) || { 
                inventory: { coins: 0 }, 
                stats: { huntsCompleted: 0, totalEarned: 0 },
                achievements: []
            };
            
            userData.inventory.coins = (userData.inventory.coins || 0) + hunt.reward;
            userData.stats.huntsCompleted = (userData.stats.huntsCompleted || 0) + 1;
            userData.stats.totalEarned = (userData.stats.totalEarned || 0) + hunt.reward;
            userData.stats.lastHunt = Date.now();
            
            // Check for achievements
            const achievements = [];
            if (userData.stats.huntsCompleted === 1) achievements.push('🏆 First Hunt');
            if (userData.stats.huntsCompleted === 10) achievements.push('🎯 Hunt Master');
            if (userData.stats.huntsCompleted === 50) achievements.push('🏴‍☠️ Treasure Legend');
            if (userData.stats.totalEarned >= 10000) achievements.push('💰 Wealthy Adventurer');
            
            if (achievements.length > 0) {
                userData.achievements = [...(userData.achievements || []), ...achievements];
            }
            
            await db.setUser(userId, userData);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('🎉 Treasure Found!')
                .setDescription(`**Congratulations!** You solved the riddle correctly!`)
                .addFields([
                    { name: '✅ Correct Answer', value: `"${hunt.answer}"`, inline: true },
                    { name: '💰 Reward Earned', value: `${hunt.reward} coins`, inline: true },
                    { name: '🎯 Attempts Used', value: `${hunt.attempts}/${hunt.maxAttempts}`, inline: true },
                    { name: '💎 Total Coins', value: `${userData.inventory.coins} coins`, inline: true },
                    { name: '🏆 Hunts Completed', value: `${userData.stats.huntsCompleted}`, inline: true },
                    { name: '⭐ Difficulty', value: hunt.difficulty.toUpperCase(), inline: true }
                ])
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
                .setFooter({ text: 'Start another hunt with /hunt!' })
                .setTimestamp();
                
            if (achievements.length > 0) {
                embed.addFields([
                    { name: '🏅 New Achievements!', value: achievements.join('\n'), inline: false }
                ]);
            }
            
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_again')
                        .setLabel('🗺️ Hunt Again')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('profile_view')
                        .setLabel('📊 View Profile')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('shop_visit')
                        .setLabel('🛒 Visit Shop')
                        .setStyle(ButtonStyle.Secondary)
                );
                
            await interaction.reply({ embeds: [embed], components: [buttons] });
        } else {
            // Wrong answer
            const attemptsLeft = hunt.maxAttempts - hunt.attempts;
            
            if (attemptsLeft <= 0) {
                // No attempts left - hunt failed
                interaction.client.activeHunts.delete(userId);
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('💀 Hunt Failed!')
                    .setDescription('You\'ve run out of attempts! The treasure remains hidden...')
                    .addFields([
                        { name: '❌ Your Answer', value: `"${answer}"`, inline: true },
                        { name: '✅ Correct Answer', value: `"${hunt.answer}"`, inline: true },
                        { name: '🎯 Attempts Used', value: `${hunt.attempts}/${hunt.maxAttempts}`, inline: true }
                    ])
                    .setFooter({ text: 'Better luck next time! Use /hunt to try again.' })
                    .setTimestamp();
                    
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('hunt_again')
                            .setLabel('🔄 Try Again')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('hint_community')
                            .setLabel('💡 Community Hints')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    
                await interaction.reply({ embeds: [embed], components: [buttons] });
            } else {
                // Wrong answer but attempts remaining
                interaction.client.activeHunts.set(userId, hunt);
                
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('❌ Incorrect Answer')
                    .setDescription('Not quite right! Keep thinking...')
                    .addFields([
                        { name: '❌ Your Answer', value: `"${answer}"`, inline: true },
                        { name: '🎯 Attempts Left', value: `${attemptsLeft}`, inline: true },
                        { name: '💰 Potential Reward', value: `${hunt.reward} coins`, inline: true },
                        { name: '🧩 Riddle', value: `*"${hunt.question}"*`, inline: false }
                    ])
                    .setFooter({ text: 'Use /hint for a clue or keep trying!' })
                    .setTimestamp();
                    
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('hunt_hint')
                            .setLabel('💡 Get Hint (50 coins)')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('hunt_think')
                            .setLabel('🤔 Think More')
                            .setStyle(ButtonStyle.Primary)
                    );
                    
                await interaction.reply({ embeds: [embed], components: [buttons] });
            }
        }
    }
};