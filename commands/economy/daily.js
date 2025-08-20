const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💰 Claim your daily treasure reward!')
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Get notified when your next daily is ready')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            const now = Date.now();
            const notify = interaction.options.getBoolean('notify') ?? false;

            // Get user data
            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    coins: 100,
                    inventory: { coins: 0 },
                    stats: { streak: 0, totalEarned: 0 },
                    dailyStreak: { count: 0, lastClaim: 0 },
                    settings: { notifications: false }
                };
                await db.setPlayer(userId, userData);
            }
        
            // Ensure necessary objects exist
            userData.inventory = userData.inventory || { coins: 0 };
            userData.stats = userData.stats || { streak: 0, totalEarned: 0 };
            userData.dailyStreak = userData.dailyStreak || { count: 0, lastClaim: 0 };
            userData.settings = userData.settings || { notifications: false };

            // Check if user already claimed today
            const lastClaim = userData.dailyStreak.lastClaim || 0;
            const timeSinceLastClaim = now - lastClaim;
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (timeSinceLastClaim < oneDay) {
                const timeUntilNext = oneDay - timeSinceLastClaim;
                const hours = Math.floor(timeUntilNext / (60 * 60 * 1000));
                const minutes = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000));
                
                // Update notification setting if requested
                if (notify !== userData.settings.notifications) {
                    userData.settings.notifications = notify;
                    await db.setPlayer(userId, userData);
                }

                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.warning || '#FFA500')
                    .setTitle('⏰ Already Claimed!')
                    .setDescription('You\'ve already claimed your daily reward today!')
                    .addFields([
                        { name: '⏱️ Time Until Next Claim', value: `${hours}h ${minutes}m`, inline: true },
                        { name: '🔥 Current Streak', value: `${userData.dailyStreak.count} days`, inline: true },
                        { name: '💰 Current Balance', value: `${userData.inventory.coins} coins`, inline: true }
                    ])
                    .setFooter({ text: notify ? 'You will be notified when your next daily is ready!' : 'Use /daily notify:true to get notified' })
                    .setTimestamp();
                    
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            // Calculate streak and rewards
            const isStreakValid = timeSinceLastClaim <= oneDay * 2; // Allow 48 hours for streak
            const currentStreak = isStreakValid ? userData.dailyStreak.count + 1 : 1;
            
            // Calculate rewards
            const baseReward = 100;
            const streakBonus = Math.floor(currentStreak / 5) * 50; // +50 coins every 5 day streak
            const totalReward = baseReward + streakBonus;

            // Update user data
            userData.inventory.coins += totalReward;
            userData.dailyStreak.count = currentStreak;
            userData.dailyStreak.lastClaim = now;
            userData.stats.totalEarned += totalReward;
            userData.settings.notifications = notify;

            // Save updated data
            await db.setPlayer(userId, userData);

            // Create reward embed
            const rewardEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success || '#00FF00')
                .setTitle('💰 Daily Reward Claimed!')
                .setDescription(`You've claimed your daily reward and earned ${totalReward} coins!`)
                .addFields([
                    { name: '💰 Reward Breakdown', value: 
                        `Base Reward: ${baseReward} coins\n` +
                        `Streak Bonus: ${streakBonus} coins\n` +
                        `Total: ${totalReward} coins`, 
                        inline: false 
                    },
                    { name: '🔥 Daily Streak', value: `${currentStreak} days`, inline: true },
                    { name: '💎 New Balance', value: `${userData.inventory.coins} coins`, inline: true },
                    { name: '📊 Total Earned', value: `${userData.stats.totalEarned} coins`, inline: true }
                ])
                .setFooter({ text: notify ? 'You will be notified when your next daily is ready!' : 'Use /daily notify:true to get notified' })
                .setTimestamp();

            // Create streak milestone bonus if applicable
            if (currentStreak % 5 === 0) {
                const milestoneBonus = 500;
                userData.inventory.coins += milestoneBonus;
                await db.setPlayer(userId, userData);

                rewardEmbed.addFields({
                    name: '🎉 Streak Milestone Bonus!',
                    value: `Congratulations! You've reached a ${currentStreak}-day streak!\nBonus Reward: ${milestoneBonus} coins`,
                    inline: false
                });
            }

            // Add buttons for related commands
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('daily_invest')
                        .setLabel('💹 Invest Rewards')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('daily_shop')
                        .setLabel('🛍️ Visit Shop')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('daily_profile')
                        .setLabel('👤 View Profile')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [rewardEmbed],
                components: [row]
            });

            // Set reminder if notifications are enabled
            if (notify) {
                setTimeout(() => {
                    interaction.followUp({
                        content: `🔔 <@${userId}> Your daily reward is ready to claim!`,
                        ephemeral: true
                    }).catch(console.error);
                }, oneDay);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleButton(interaction) {
        try {
            await interaction.deferUpdate();

            const [action] = interaction.customId.split('_').slice(1);
            const command = interaction.client.commands.get(action);

            if (command) {
                await command.execute(interaction);
            } else {
                throw new Error(`Command ${action} not found!`);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    }
};