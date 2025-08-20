const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for the bot and earn rewards!'),
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const userData = await db.getPlayer(userId) || {};
            
            // Check if user has voted in the last 12 hours
            const lastVote = userData.lastVote || 0;
            const voteInterval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
            const canVote = Date.now() - lastVote >= voteInterval;

            const embed = new EmbedBuilder()
                .setColor(canVote ? config.embedColors.success : config.embedColors.warning)
                .setTitle('🗳️ Vote for RPG Treasure Hunter Bot')
                .setDescription(canVote ? 
                    'Vote for our bot and receive awesome rewards!' : 
                    'You have already voted recently. Thank you for your support!')
                .addFields([
                    { 
                        name: '🎁 Vote Rewards', 
                        value: '• **500 Coins** - Instant reward\n• **Vote Streak Bonus** - Extra rewards for consecutive votes\n• **Exclusive Items** - Special rewards for loyal voters\n• **Experience Boost** - 2x XP for 1 hour', 
                        inline: false 
                    },
                    { 
                        name: '📊 Your Vote Stats', 
                        value: `• **Total Votes**: ${userData.totalVotes || 0}\n• **Current Streak**: ${userData.voteStreak || 0}\n• **Last Vote**: ${lastVote ? `<t:${Math.floor(lastVote / 1000)}:R>` : 'Never'}`, 
                        inline: true 
                    },
                    { 
                        name: canVote ? '⏰ Vote Now!' : '⏰ Next Vote', 
                        value: canVote ? 'Click the button below to vote!' : `<t:${Math.floor((lastVote + voteInterval) / 1000)}:R>`, 
                        inline: true 
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Voting helps us grow and improve the bot!' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🗳️ Vote on Top.gg')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://top.gg/bot/your-bot-id/vote') // Update with actual bot ID
                        .setDisabled(!canVote),
                    new ButtonBuilder()
                        .setLabel('🌟 Vote on DiscordBotList')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discordbotlist.com/bots/your-bot-id/upvote') // Update with actual bot ID
                        .setDisabled(!canVote)
                );

            await interaction.reply({ embeds: [embed], components: [row] });

            // If user can vote, prepare reward system (would be triggered by webhook in production)
            if (canVote && interaction.customId === 'claim_vote_reward') {
                await this.claimVoteReward(interaction, userId);
            }
        } catch (error) {
            console.error('Vote command error:', error);
            await interaction.reply({ 
                content: 'Error accessing vote information.', 
                ephemeral: true 
            });
        }
    },

    async claimVoteReward(interaction, userId) {
        try {
            const userData = await db.getPlayer(userId) || { coins: 0, totalVotes: 0, voteStreak: 0 };
            
            // Update vote data
            userData.lastVote = Date.now();
            userData.totalVotes = (userData.totalVotes || 0) + 1;
            userData.voteStreak = (userData.voteStreak || 0) + 1;
            userData.coins = (userData.coins || 0) + 500;

            // Streak bonuses
            if (userData.voteStreak >= 7) {
                userData.coins += 200; // Weekly streak bonus
            }
            if (userData.voteStreak >= 30) {
                userData.coins += 1000; // Monthly streak bonus
            }

            await db.updatePlayer(userId, userData);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors.success)
                .setTitle('🎉 Vote Reward Claimed!')
                .setDescription('Thank you for voting! Here are your rewards:')
                .addFields([
                    { name: '💰 Coins Earned', value: `+500 coins`, inline: true },
                    { name: '🔥 Vote Streak', value: `${userData.voteStreak} days`, inline: true },
                    { name: '💼 Total Balance', value: `${userData.coins} coins`, inline: true }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Vote reward error:', error);
            await interaction.reply({ 
                content: 'Error claiming vote reward.', 
                ephemeral: true 
            });
        }
    }
};