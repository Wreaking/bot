const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const achievements = {
    treasure: [
        { id: 'first_hunt', name: 'First Hunt', description: 'Complete your first treasure hunt', reward: 100, emoji: '🏁' },
        { id: 'hunt_master', name: 'Hunt Master', description: 'Complete 50 treasure hunts', reward: 1000, emoji: '🎯' },
        { id: 'riddle_solver', name: 'Riddle Solver', description: 'Solve 25 riddles correctly', reward: 500, emoji: '🧩' },
        { id: 'treasure_legend', name: 'Treasure Legend', description: 'Complete 100 treasure hunts', reward: 2500, emoji: '🏴‍☠️' },
        { id: 'expert_hunter', name: 'Expert Hunter', description: 'Complete 10 expert difficulty hunts', reward: 1500, emoji: '⚡' }
    ],
    combat: [
        { id: 'first_battle', name: 'First Battle', description: 'Win your first battle', reward: 150, emoji: '⚔️' },
        { id: 'battle_champion', name: 'Battle Champion', description: 'Win 25 battles', reward: 750, emoji: '🏆' },
        { id: 'arena_warrior', name: 'Arena Warrior', description: 'Reach Silver rank in arena', reward: 600, emoji: '🥈' },
        { id: 'dungeon_conqueror', name: 'Dungeon Conqueror', description: 'Clear 10 dungeons', reward: 1200, emoji: '🏰' },
        { id: 'legendary_fighter', name: 'Legendary Fighter', description: 'Win 100 battles', reward: 3000, emoji: '👑' }
    ],
    wealth: [
        { id: 'coin_collector', name: 'Coin Collector', description: 'Accumulate 10,000 coins', reward: 500, emoji: '💰' },
        { id: 'wealthy_adventurer', name: 'Wealthy Adventurer', description: 'Accumulate 100,000 coins', reward: 2000, emoji: '💎' },
        { id: 'big_spender', name: 'Big Spender', description: 'Spend 50,000 coins', reward: 1000, emoji: '🛒' },
        { id: 'daily_dedication', name: 'Daily Dedication', description: 'Claim daily rewards 30 days in a row', reward: 1500, emoji: '📅' },
        { id: 'millionaire', name: 'Millionaire', description: 'Earn 1,000,000 coins total', reward: 10000, emoji: '🏦' }
    ],
    exploration: [
        { id: 'explorer', name: 'Explorer', description: 'Visit all exploration areas', reward: 800, emoji: '🗺️' },
        { id: 'master_miner', name: 'Master Miner', description: 'Reach mining level 10', reward: 700, emoji: '⛏️' },
        { id: 'skilled_fisher', name: 'Skilled Fisher', description: 'Catch 100 fish', reward: 600, emoji: '🎣' },
        { id: 'herb_gatherer', name: 'Herb Gatherer', description: 'Collect 50 herbs and ingredients', reward: 400, emoji: '🌿' },
        { id: 'legendary_catch', name: 'Legendary Catch', description: 'Catch a mythical sea creature', reward: 2000, emoji: '🐉' }
    ],
    magic: [
        { id: 'apprentice_mage', name: 'Apprentice Mage', description: 'Learn your first spell', reward: 300, emoji: '🔮' },
        { id: 'spell_caster', name: 'Spell Caster', description: 'Cast 100 spells', reward: 800, emoji: '✨' },
        { id: 'arcane_master', name: 'Arcane Master', description: 'Reach magic level 15', reward: 1500, emoji: '🧙‍♂️' },
        { id: 'potion_brewer', name: 'Potion Brewer', description: 'Brew 25 potions', reward: 600, emoji: '🧪' },
        { id: 'grand_wizard', name: 'Grand Wizard', description: 'Master all schools of magic', reward: 5000, emoji: '🌟' }
    ],
    social: [
        { id: 'guild_founder', name: 'Guild Founder', description: 'Create a guild', reward: 1000, emoji: '🏛️' },
        { id: 'team_player', name: 'Team Player', description: 'Complete 10 group activities', reward: 750, emoji: '👥' },
        { id: 'helpful_friend', name: 'Helpful Friend', description: 'Help other players 25 times', reward: 500, emoji: '🤝' },
        { id: 'social_butterfly', name: 'Social Butterfly', description: 'Make 10 friends in the game', reward: 400, emoji: '🦋' },
        { id: 'community_leader', name: 'Community Leader', description: 'Lead a guild to 25 members', reward: 2500, emoji: '👑' }
    ],
    crafting: [
        { id: 'first_craft', name: 'First Craft', description: 'Craft your first item', reward: 200, emoji: '🔨' },
        { id: 'skilled_crafter', name: 'Skilled Crafter', description: 'Craft 50 items', reward: 800, emoji: '⚒️' },
        { id: 'master_craftsman', name: 'Master Craftsman', description: 'Reach crafting level 20', reward: 1500, emoji: '👨‍🏭' },
        { id: 'legendary_smith', name: 'Legendary Smith', description: 'Craft a legendary item', reward: 2000, emoji: '🗡️' },
        { id: 'item_collector', name: 'Item Collector', description: 'Own 100 different items', reward: 1200, emoji: '🎒' }
    ],
    special: [
        { id: 'early_adopter', name: 'Early Adopter', description: 'Join the bot in its first month', reward: 1000, emoji: '🌟' },
        { id: 'dedication', name: 'Dedication', description: 'Play for 100 days', reward: 3000, emoji: '🗓️' },
        { id: 'completionist', name: 'Completionist', description: 'Unlock all other achievements', reward: 10000, emoji: '🏅' },
        { id: 'bot_supporter', name: 'Bot Supporter', description: 'Support the bot development', reward: 5000, emoji: '❤️' },
        { id: 'feedback_provider', name: 'Feedback Provider', description: 'Provide valuable feedback', reward: 500, emoji: '💬' }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('🏅 View your achievements and unlock rewards!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('View specific achievement category')
                .setRequired(false)
                .addChoices(
                    { name: '🏴‍☠️ Treasure Hunting', value: 'treasure' },
                    { name: '⚔️ Combat & Arena', value: 'combat' },
                    { name: '💰 Wealth & Economy', value: 'wealth' },
                    { name: '🗺️ Exploration', value: 'exploration' },
                    { name: '🔮 Magic & Spells', value: 'magic' },
                    { name: '👥 Social & Guilds', value: 'social' },
                    { name: '🔨 Crafting & Items', value: 'crafting' },
                    { name: '⭐ Special', value: 'special' }
                )),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const userId = interaction.user.id;
        
        if (category) {
            await this.showCategoryAchievements(interaction, category);
        } else {
            await this.showAllAchievements(interaction);
        }
    },
    
    async showAllAchievements(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { achievements: [] };
        const userAchievements = userData.achievements || [];
        
        // Calculate achievement statistics
        const totalAchievements = this.getTotalAchievementCount();
        const unlockedCount = userAchievements.length;
        const completionRate = Math.round((unlockedCount / totalAchievements) * 100);
        
        // Calculate total rewards earned
        const totalRewards = this.calculateTotalRewards(userAchievements);
        
        // Get recent achievements
        const recentAchievements = userAchievements
            .filter(ach => ach.unlockedAt > Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            .slice(0, 5);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`🏅 ${interaction.user.displayName}'s Achievement Collection`)
            .setDescription('**Track your progress and unlock amazing rewards!**')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '📊 Achievement Progress',
                    value: `🏅 Unlocked: **${unlockedCount}/${totalAchievements}**\n📈 Completion: **${completionRate}%**\n💰 Rewards Earned: **${totalRewards}** coins`,
                    inline: true
                },
                {
                    name: '🎯 Achievement Hunter Rank',
                    value: this.getHunterRank(completionRate),
                    inline: true
                },
                {
                    name: '⭐ Special Status',
                    value: this.getSpecialStatus(userAchievements),
                    inline: true
                }
            ]);
            
        // Add category breakdown
        const categoryBreakdown = Object.keys(achievements).map(cat => {
            const categoryAchievements = achievements[cat];
            const categoryUnlocked = userAchievements.filter(ach => 
                categoryAchievements.some(catAch => catAch.id === ach.id)
            ).length;
            
            return `${this.getCategoryEmoji(cat)} **${this.getCategoryName(cat)}**: ${categoryUnlocked}/${categoryAchievements.length}`;
        }).join('\n');
        
        embed.addFields([
            { name: '📋 Categories Overview', value: categoryBreakdown, inline: false }
        ]);
        
        // Add recent achievements
        if (recentAchievements.length > 0) {
            const recentText = recentAchievements.map(ach => {
                const achData = this.findAchievementData(ach.id);
                return `${achData.emoji} **${achData.name}** - ${new Date(ach.unlockedAt).toLocaleDateString()}`;
            }).join('\n');
            
            embed.addFields([
                { name: '🆕 Recently Unlocked (Last 7 days)', value: recentText, inline: false }
            ]);
        }
        
        // Progress bars for categories
        const progressBars = Object.keys(achievements).slice(0, 4).map(cat => {
            const categoryAchievements = achievements[cat];
            const categoryUnlocked = userAchievements.filter(ach => 
                categoryAchievements.some(catAch => catAch.id === ach.id)
            ).length;
            const progress = Math.round((categoryUnlocked / categoryAchievements.length) * 10);
            const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);
            
            return `${this.getCategoryEmoji(cat)} ${bar} ${categoryUnlocked}/${categoryAchievements.length}`;
        }).join('\n');
        
        embed.addFields([
            { name: '📊 Category Progress', value: progressBars, inline: false }
        ]);
        
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('achievement_category_select')
            .setPlaceholder('🏅 Select a category to explore...')
            .addOptions([
                {
                    label: 'Treasure Hunting',
                    description: `${this.getCategoryProgress(userAchievements, 'treasure')} achievements`,
                    value: 'achievements_treasure',
                    emoji: '🏴‍☠️'
                },
                {
                    label: 'Combat & Arena',
                    description: `${this.getCategoryProgress(userAchievements, 'combat')} achievements`,
                    value: 'achievements_combat',
                    emoji: '⚔️'
                },
                {
                    label: 'Wealth & Economy',
                    description: `${this.getCategoryProgress(userAchievements, 'wealth')} achievements`,
                    value: 'achievements_wealth',
                    emoji: '💰'
                },
                {
                    label: 'Exploration',
                    description: `${this.getCategoryProgress(userAchievements, 'exploration')} achievements`,
                    value: 'achievements_exploration',
                    emoji: '🗺️'
                },
                {
                    label: 'Magic & Spells',
                    description: `${this.getCategoryProgress(userAchievements, 'magic')} achievements`,
                    value: 'achievements_magic',
                    emoji: '🔮'
                },
                {
                    label: 'Social & Guilds',
                    description: `${this.getCategoryProgress(userAchievements, 'social')} achievements`,
                    value: 'achievements_social',
                    emoji: '👥'
                },
                {
                    label: 'Crafting & Items',
                    description: `${this.getCategoryProgress(userAchievements, 'crafting')} achievements`,
                    value: 'achievements_crafting',
                    emoji: '🔨'
                },
                {
                    label: 'Special Achievements',
                    description: `${this.getCategoryProgress(userAchievements, 'special')} achievements`,
                    value: 'achievements_special',
                    emoji: '⭐'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('achievement_claim_all')
                    .setLabel('🎁 Claim Rewards')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('achievement_progress')
                    .setLabel('📈 Track Progress')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('achievement_leaderboard')
                    .setLabel('🏆 Leaderboard')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('achievement_guide')
                    .setLabel('📖 Achievement Guide')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async showCategoryAchievements(interaction, category) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { achievements: [] };
        const userAchievements = userData.achievements || [];
        
        const categoryAchievements = achievements[category] || [];
        const categoryName = this.getCategoryName(category);
        
        const embed = new EmbedBuilder()
            .setColor(this.getCategoryColor(category))
            .setTitle(`${this.getCategoryEmoji(category)} ${categoryName} Achievements`)
            .setDescription(`**${categoryAchievements.length} achievements in this category**`)
            .setThumbnail(interaction.user.displayAvatarURL());
            
        // Calculate category progress
        const unlockedInCategory = userAchievements.filter(ach => 
            categoryAchievements.some(catAch => catAch.id === ach.id)
        ).length;
        
        embed.addFields([
            {
                name: '📊 Category Progress',
                value: `🏅 Unlocked: **${unlockedInCategory}/${categoryAchievements.length}**\n📈 Completion: **${Math.round((unlockedInCategory / categoryAchievements.length) * 100)}%**`,
                inline: true
            }
        ]);
        
        // Add each achievement
        categoryAchievements.forEach(achievement => {
            const isUnlocked = userAchievements.some(ach => ach.id === achievement.id);
            const status = isUnlocked ? '✅ **UNLOCKED**' : '🔒 Locked';
            const progress = this.getAchievementProgress(userData, achievement);
            
            embed.addFields([{
                name: `${achievement.emoji} ${achievement.name} ${isUnlocked ? '✅' : '🔒'}`,
                value: `📝 ${achievement.description}\n💰 Reward: **${achievement.reward}** coins\n${status}${progress ? `\n📊 Progress: ${progress}` : ''}`,
                inline: true
            }]);
        });
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('achievement_all')
                    .setLabel('← All Achievements')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`achievement_tips_${category}`)
                    .setLabel('💡 Tips & Guides')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('achievement_claim_category')
                    .setLabel('🎁 Claim Category Rewards')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    // Helper methods
    getTotalAchievementCount() {
        return Object.values(achievements).reduce((total, category) => total + category.length, 0);
    },
    
    calculateTotalRewards(userAchievements) {
        return userAchievements.reduce((total, ach) => {
            const achData = this.findAchievementData(ach.id);
            return total + (achData ? achData.reward : 0);
        }, 0);
    },
    
    findAchievementData(achievementId) {
        for (const category of Object.values(achievements)) {
            const found = category.find(ach => ach.id === achievementId);
            if (found) return found;
        }
        return null;
    },
    
    getHunterRank(completionRate) {
        if (completionRate >= 90) return '🌟 **Legendary Hunter**';
        if (completionRate >= 75) return '💎 **Master Hunter**';
        if (completionRate >= 50) return '🏆 **Expert Hunter**';
        if (completionRate >= 25) return '🥈 **Skilled Hunter**';
        if (completionRate >= 10) return '🥉 **Novice Hunter**';
        return '🆕 **Beginner Hunter**';
    },
    
    getSpecialStatus(userAchievements) {
        const specialAchievements = userAchievements.filter(ach => 
            achievements.special.some(special => special.id === ach.id)
        );
        
        if (specialAchievements.length >= 3) return '⭐ **Elite Member**';
        if (specialAchievements.length >= 1) return '🌟 **Special Member**';
        return '👤 **Regular Member**';
    },
    
    getCategoryProgress(userAchievements, category) {
        const categoryAchievements = achievements[category] || [];
        const unlockedCount = userAchievements.filter(ach => 
            categoryAchievements.some(catAch => catAch.id === ach.id)
        ).length;
        return `${unlockedCount}/${categoryAchievements.length}`;
    },
    
    getAchievementProgress(userData, achievement) {
        // This would calculate specific progress for each achievement
        // For now, return null (no progress tracking)
        return null;
    },
    
    getCategoryName(category) {
        const names = {
            treasure: 'Treasure Hunting',
            combat: 'Combat & Arena',
            wealth: 'Wealth & Economy',
            exploration: 'Exploration',
            magic: 'Magic & Spells',
            social: 'Social & Guilds',
            crafting: 'Crafting & Items',
            special: 'Special Achievements'
        };
        return names[category] || 'Unknown Category';
    },
    
    getCategoryEmoji(category) {
        const emojis = {
            treasure: '🏴‍☠️',
            combat: '⚔️',
            wealth: '💰',
            exploration: '🗺️',
            magic: '🔮',
            social: '👥',
            crafting: '🔨',
            special: '⭐'
        };
        return emojis[category] || '📋';
    },
    
    getCategoryColor(category) {
        const colors = {
            treasure: 0xFFD700,
            combat: 0xFF4500,
            wealth: 0x32CD32,
            exploration: 0x4682B4,
            magic: 0x9370DB,
            social: 0xFF69B4,
            crafting: 0x8B4513,
            special: 0xFFB6C1
        };
        return colors[category] || 0x808080;
    },

    // Enhanced button handlers for achievements
    buttonHandlers: {
        async claim_all(interaction) {
            const userId = interaction.user.id;
            const userData = await db.getPlayer(userId) || { achievements: [], coins: 0 };
            const userAchievements = userData.achievements || [];

            // Find unclaimed achievements
            const unclaimedRewards = userAchievements.filter(ach => !ach.claimed);
            
            if (unclaimedRewards.length === 0) {
                return await interaction.reply({
                    content: '✅ You have already claimed all available rewards!',
                    ephemeral: true
                });
            }

            const totalReward = unclaimedRewards.reduce((total, ach) => {
                const achData = this.findAchievementData(ach.id);
                return total + (achData ? achData.reward : 0);
            }, 0);

            // Mark achievements as claimed and add rewards
            userAchievements.forEach(ach => { ach.claimed = true; });
            
            await db.updatePlayer(userId, {
                achievements: userAchievements,
                coins: userData.coins + totalReward
            });

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.success || '#00FF00')
                .setTitle('🎉 Rewards Claimed!')
                .setDescription(`You've claimed **${totalReward}** coins from **${unclaimedRewards.length}** achievements!`)
                .addFields([
                    { name: '💰 New Balance', value: `${userData.coins + totalReward} coins`, inline: true },
                    { name: '🏆 Achievements Claimed', value: `${unclaimedRewards.length}`, inline: true }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        },

        async progress(interaction) {
            const userId = interaction.user.id;
            const userData = await db.getPlayer(userId) || {};
            
            // Calculate detailed progress
            const progressEmbed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099ff')
                .setTitle('📈 Achievement Progress Tracker')
                .setDescription('Track your progress towards unlocking achievements!');

            // Add progress bars for each category
            const categories = Object.keys(achievements);
            const progressData = categories.map(category => {
                const categoryAchievements = achievements[category];
                const unlocked = userData.achievements?.filter(ach => 
                    categoryAchievements.some(catAch => catAch.id === ach.id)
                ).length || 0;
                
                const progress = Math.round((unlocked / categoryAchievements.length) * 20);
                const progressBar = '█'.repeat(progress) + '░'.repeat(20 - progress);
                
                return {
                    name: `${this.getCategoryEmoji(category)} ${this.getCategoryName(category)}`,
                    value: `${progressBar} ${unlocked}/${categoryAchievements.length} (${Math.round((unlocked / categoryAchievements.length) * 100)}%)`,
                    inline: false
                };
            });

            progressEmbed.addFields(progressData);
            
            await interaction.reply({ embeds: [progressEmbed], ephemeral: true });
        },

        async leaderboard(interaction) {
            // This would show the achievement leaderboard
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099ff')
                .setTitle('🏆 Achievement Leaderboard')
                .setDescription('Top achievement hunters on this server!')
                .addFields([
                    { name: '🥇 1st Place', value: 'Coming Soon!', inline: true },
                    { name: '🥈 2nd Place', value: 'Coming Soon!', inline: true },
                    { name: '🥉 3rd Place', value: 'Coming Soon!', inline: true }
                ])
                .setFooter({ text: 'Leaderboard updates every hour' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async guide(interaction) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#0099ff')
                .setTitle('📖 Achievement Guide')
                .setDescription('**How to unlock achievements and maximize your rewards!**')
                .addFields([
                    {
                        name: '🏴‍☠️ Treasure Hunting Tips',
                        value: '• Use `/hunt` regularly to find treasures\n• Complete daily treasure hunts\n• Solve riddles for bonus rewards',
                        inline: false
                    },
                    {
                        name: '⚔️ Combat Achievements',
                        value: '• Challenge other players with `/battle`\n• Join arena tournaments\n• Complete dungeon raids',
                        inline: false
                    },
                    {
                        name: '💰 Wealth Building',
                        value: '• Use `/daily` for consistent income\n• Invest wisely with `/invest`\n• Trade in the marketplace',
                        inline: false
                    },
                    {
                        name: '🎯 Pro Tips',
                        value: '• Check achievements daily for new unlocks\n• Focus on one category at a time\n• Join a guild for social achievements',
                        inline: false
                    }
                ])
                .setFooter({ text: 'More detailed guides available in each category!' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    // Enhanced select menu handlers
    selectMenuHandlers: {
        async category_select(interaction) {
            const selectedValue = interaction.values[0];
            const category = selectedValue.replace('achievements_', '');
            
            await this.showCategoryAchievements(interaction, category);
        }
    }
};