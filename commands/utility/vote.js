
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('🗳️ Vote for the bot and earn amazing rewards!')
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Choose voting platform')
                .setRequired(false)
                .addChoices(
                    { name: '🌟 Top.gg', value: 'topgg' },
                    { name: '🤖 Discord Bot List', value: 'dbl' },
                    { name: '🎮 Discord Bots', value: 'discordbots' },
                    { name: '📊 All Platforms', value: 'all' }
                )),
    
    async execute(interaction) {
        const platform = interaction.options?.getString('platform') || 'all';
        const userId = interaction.user.id;
        
        try {
            const userData = await db.getPlayer(userId) || {};
            const voteData = userData.voting || {
                totalVotes: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastVote: 0,
                platforms: {},
                rewardsEarned: 0,
                specialRewards: []
            };

            await this.showVotingInterface(interaction, userData, voteData, platform);
        } catch (error) {
            console.error('Vote command error:', error);
            await interaction.reply({ 
                content: '❌ Error accessing voting information. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async showVotingInterface(interaction, userData, voteData, platform) {
        const voteInterval = 12 * 60 * 60 * 1000; // 12 hours
        const currentTime = Date.now();
        
        const platforms = this.getVotingPlatforms();
        const availablePlatforms = platform === 'all' ? 
            platforms : platforms.filter(p => p.id === platform);

        // Calculate vote status for each platform
        const platformStatus = availablePlatforms.map(p => {
            const lastVote = voteData.platforms[p.id]?.lastVote || 0;
            const canVote = currentTime - lastVote >= voteInterval;
            const nextVoteTime = lastVote + voteInterval;
            
            return {
                ...p,
                canVote,
                lastVote,
                nextVoteTime,
                votes: voteData.platforms[p.id]?.votes || 0
            };
        });

        const embed = new EmbedBuilder()
            .setColor(this.getVoteEmbedColor(voteData.currentStreak))
            .setTitle('🗳️ Vote for Treasure Hunter Bot')
            .setDescription('**Support our bot and earn incredible rewards!**\n\nYour votes help us grow and add amazing new features!')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/vote-icon.png')
            .addFields([
                { 
                    name: '🎁 Vote Rewards', 
                    value: this.getRewardsList(), 
                    inline: false 
                },
                { 
                    name: '📊 Your Voting Stats', 
                    value: this.getVotingStats(voteData), 
                    inline: true 
                },
                { 
                    name: '🔥 Current Streak', 
                    value: this.getStreakInfo(voteData), 
                    inline: true 
                },
                { 
                    name: '🏆 Achievements', 
                    value: this.getVotingAchievements(voteData), 
                    inline: true 
                }
            ]);

        // Add platform-specific information
        const platformInfo = platformStatus.map(p => {
            const status = p.canVote ? '✅ **Available**' : `⏰ <t:${Math.floor(p.nextVoteTime / 1000)}:R>`;
            const reward = this.getPlatformReward(p.id, voteData.currentStreak);
            return `${p.emoji} **${p.name}**\n└ Status: ${status}\n└ Reward: ${reward}\n└ Your votes: ${p.votes}`;
        }).join('\n\n');

        embed.addFields({ 
            name: '🌟 Voting Platforms', 
            value: platformInfo, 
            inline: false 
        });

        // Add special promotions if any
        const specialPromotions = this.getSpecialPromotions();
        if (specialPromotions.length > 0) {
            embed.addFields({ 
                name: '🎉 Special Promotions', 
                value: specialPromotions.map(promo => `🌟 **${promo.title}**\n└ ${promo.description}`).join('\n\n'), 
                inline: false 
            });
        }

        // Create voting buttons
        const voteButtons = platformStatus.filter(p => p.canVote).map(p => 
            new ButtonBuilder()
                .setLabel(`Vote on ${p.name}`)
                .setStyle(ButtonStyle.Link)
                .setURL(p.voteUrl)
                .setEmoji(p.emoji)
        );

        // Create action buttons
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('vote_check_status')
                    .setLabel('Check Vote Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('vote_claim_rewards')
                    .setLabel('Claim Pending Rewards')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('vote_leaderboard')
                    .setLabel('Vote Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('vote_notifications')
                    .setLabel('Vote Reminders')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔔')
            );

        const components = [];
        
        // Add vote buttons in chunks of 5 (Discord limit)
        for (let i = 0; i < voteButtons.length; i += 5) {
            const chunk = voteButtons.slice(i, i + 5);
            components.push(new ActionRowBuilder().addComponents(chunk));
        }
        
        components.push(actionButtons);

        // Add platform selector if viewing all platforms
        if (platform === 'all' && platformStatus.length > 1) {
            const platformSelect = new StringSelectMenuBuilder()
                .setCustomId('vote_platform_select')
                .setPlaceholder('🌟 Select a specific platform...')
                .addOptions(
                    platforms.map(p => ({
                        label: p.name,
                        description: `Vote every 12 hours • ${this.getPlatformReward(p.id, voteData.currentStreak)}`,
                        value: p.id,
                        emoji: p.emoji
                    }))
                );
            
            components.unshift(new ActionRowBuilder().addComponents(platformSelect));
        }

        await interaction.reply({ embeds: [embed], components });
    },

    async claimVoteReward(interaction, userId, platform) {
        try {
            const userData = await db.getPlayer(userId) || { coins: 0, experience: 0 };
            const voteData = userData.voting || {
                totalVotes: 0,
                currentStreak: 0,
                longestStreak: 0,
                platforms: {},
                rewardsEarned: 0,
                specialRewards: []
            };

            // Update vote data
            const currentTime = Date.now();
            voteData.totalVotes++;
            voteData.lastVote = currentTime;
            
            // Update platform-specific data
            if (!voteData.platforms[platform]) {
                voteData.platforms[platform] = { votes: 0, lastVote: 0 };
            }
            voteData.platforms[platform].votes++;
            voteData.platforms[platform].lastVote = currentTime;

            // Calculate streak
            const timeSinceLastVote = currentTime - (voteData.lastVote || 0);
            if (timeSinceLastVote <= 24 * 60 * 60 * 1000) { // Within 24 hours
                voteData.currentStreak++;
            } else {
                voteData.currentStreak = 1;
            }
            voteData.longestStreak = Math.max(voteData.longestStreak, voteData.currentStreak);

            // Calculate rewards
            const rewards = this.calculateVoteRewards(platform, voteData.currentStreak, voteData.totalVotes);
            
            // Apply rewards
            userData.coins = (userData.coins || 0) + rewards.coins;
            userData.experience = (userData.experience || 0) + rewards.experience;
            voteData.rewardsEarned += rewards.coins;

            // Check for special rewards
            const specialReward = this.checkSpecialRewards(voteData);
            if (specialReward) {
                voteData.specialRewards.push(specialReward);
                rewards.special = specialReward;
            }

            // Update database
            userData.voting = voteData;
            await db.updatePlayer(userId, userData);

            // Create reward embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 Vote Reward Claimed!')
                .setDescription(`**Thank you for voting on ${this.getPlatformName(platform)}!**\n\nYour support means everything to us!`)
                .addFields([
                    { 
                        name: '💰 Rewards Earned', 
                        value: `**Coins:** +${rewards.coins.toLocaleString()}\n**Experience:** +${rewards.experience}\n**Streak Bonus:** ${rewards.streakBonus || 'None'}`, 
                        inline: true 
                    },
                    { 
                        name: '🔥 Vote Streak', 
                        value: `**Current:** ${voteData.currentStreak} days\n**Longest:** ${voteData.longestStreak} days\n**Total Votes:** ${voteData.totalVotes}`, 
                        inline: true 
                    },
                    { 
                        name: '💼 Updated Balance', 
                        value: `**Coins:** ${userData.coins.toLocaleString()}\n**Experience:** ${userData.experience.toLocaleString()}\n**Level:** ${Math.floor(userData.experience / 100) + 1}`, 
                        inline: true 
                    }
                ]);

            if (rewards.special) {
                embed.addFields({ 
                    name: '🌟 Special Reward!', 
                    value: `**${rewards.special.name}**\n${rewards.special.description}`, 
                    inline: false 
                });
            }

            embed.setFooter({ text: 'Come back in 12 hours to vote again!' })
                 .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Vote reward error:', error);
            await interaction.reply({ 
                content: '❌ Error claiming vote reward. Please try again.', 
                ephemeral: true 
            });
        }
    },

    getVotingPlatforms() {
        return [
            {
                id: 'topgg',
                name: 'Top.gg',
                emoji: '🌟',
                voteUrl: 'https://top.gg/bot/YOUR_BOT_ID/vote',
                baseReward: { coins: 500, experience: 100 }
            },
            {
                id: 'dbl',
                name: 'Discord Bot List',
                emoji: '🤖',
                voteUrl: 'https://discordbotlist.com/bots/YOUR_BOT_ID/upvote',
                baseReward: { coins: 400, experience: 80 }
            },
            {
                id: 'discordbots',
                name: 'Discord Bots',
                emoji: '🎮',
                voteUrl: 'https://discord.bots.gg/bots/YOUR_BOT_ID/vote',
                baseReward: { coins: 300, experience: 60 }
            }
        ];
    },

    getRewardsList() {
        return `**Base Rewards:**\n• 💰 **500+ Coins** - Instant reward\n• ⭐ **100+ Experience** - Level up faster\n• 🔥 **Streak Bonuses** - Up to 3x multiplier\n\n**Milestone Rewards:**\n• 🏆 **Special Items** - Exclusive equipment\n• 💎 **Premium Currency** - Rare resources\n• 🎨 **Cosmetics** - Unique badges and titles`;
    },

    getVotingStats(voteData) {
        return `**Total Votes:** ${voteData.totalVotes}\n**Rewards Earned:** ${voteData.rewardsEarned.toLocaleString()} coins\n**Last Vote:** ${voteData.lastVote ? `<t:${Math.floor(voteData.lastVote / 1000)}:R>` : 'Never'}`;
    },

    getStreakInfo(voteData) {
        const streakEmoji = this.getStreakEmoji(voteData.currentStreak);
        return `${streakEmoji} **${voteData.currentStreak} days**\n**Longest:** ${voteData.longestStreak} days\n**Multiplier:** ${this.getStreakMultiplier(voteData.currentStreak)}x`;
    },

    getVotingAchievements(voteData) {
        const achievements = [];
        if (voteData.totalVotes >= 10) achievements.push('🏅 Loyal Supporter');
        if (voteData.currentStreak >= 7) achievements.push('🔥 Week Warrior');
        if (voteData.currentStreak >= 30) achievements.push('💎 Monthly Master');
        if (voteData.longestStreak >= 100) achievements.push('🏆 Century Voter');
        
        return achievements.length > 0 ? achievements.join('\n') : 'No achievements yet';
    },

    getSpecialPromotions() {
        // This could be dynamic based on current events
        return [
            {
                title: 'Double XP Weekend',
                description: 'Vote this weekend for 2x experience rewards!'
            }
        ];
    },

    getPlatformReward(platformId, streak) {
        const platform = this.getVotingPlatforms().find(p => p.id === platformId);
        if (!platform) return 'Unknown';
        
        const multiplier = this.getStreakMultiplier(streak);
        return `${Math.floor(platform.baseReward.coins * multiplier)} coins`;
    },

    getPlatformName(platformId) {
        const platform = this.getVotingPlatforms().find(p => p.id === platformId);
        return platform ? platform.name : 'Unknown Platform';
    },

    calculateVoteRewards(platform, streak, totalVotes) {
        const platformData = this.getVotingPlatforms().find(p => p.id === platform);
        if (!platformData) return { coins: 0, experience: 0 };

        const multiplier = this.getStreakMultiplier(streak);
        const milestoneBonus = this.getMilestoneBonus(totalVotes);

        return {
            coins: Math.floor(platformData.baseReward.coins * multiplier) + milestoneBonus.coins,
            experience: Math.floor(platformData.baseReward.experience * multiplier) + milestoneBonus.experience,
            streakBonus: streak >= 7 ? `${Math.floor((multiplier - 1) * 100)}% bonus` : null
        };
    },

    checkSpecialRewards(voteData) {
        // Check for milestone rewards
        if (voteData.totalVotes === 10) {
            return { name: 'Supporter Badge', description: 'A special badge for loyal supporters!' };
        }
        if (voteData.totalVotes === 50) {
            return { name: 'Golden Compass', description: 'A legendary treasure hunting tool!' };
        }
        if (voteData.currentStreak === 30) {
            return { name: 'Dedication Crown', description: 'Crown of the most dedicated voters!' };
        }
        return null;
    },

    getStreakMultiplier(streak) {
        if (streak >= 30) return 3.0;
        if (streak >= 14) return 2.5;
        if (streak >= 7) return 2.0;
        if (streak >= 3) return 1.5;
        return 1.0;
    },

    getMilestoneBonus(totalVotes) {
        if (totalVotes >= 100) return { coins: 1000, experience: 200 };
        if (totalVotes >= 50) return { coins: 500, experience: 100 };
        if (totalVotes >= 25) return { coins: 250, experience: 50 };
        return { coins: 0, experience: 0 };
    },

    getStreakEmoji(streak) {
        if (streak >= 30) return '💎';
        if (streak >= 14) return '🏆';
        if (streak >= 7) return '🔥';
        if (streak >= 3) return '⭐';
        return '📈';
    },

    getVoteEmbedColor(streak) {
        if (streak >= 30) return '#9B59B6'; // Purple
        if (streak >= 14) return '#F1C40F'; // Gold
        if (streak >= 7) return '#E67E22';  // Orange
        if (streak >= 3) return '#3498DB';  // Blue
        return '#2ECC71'; // Green
    }
};
