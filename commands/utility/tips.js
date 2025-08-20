
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tips')
        .setDescription('💡 Get helpful tips for treasure hunting success')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose tip category')
                .setRequired(false)
                .addChoices(
                    { name: '🌱 Beginner Guide', value: 'beginner' },
                    { name: '⚔️ Combat Tips', value: 'combat' },
                    { name: '💰 Economy Mastery', value: 'economy' },
                    { name: '🎯 Advanced Strategy', value: 'advanced' },
                    { name: '🏆 Pro Techniques', value: 'pro' },
                    { name: '📈 Progression', value: 'progression' }
                ))
        .addBooleanOption(option =>
            option.setName('daily')
                .setDescription('Get your personalized daily tip')
                .setRequired(false)),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const isDailyTip = interaction.options?.getBoolean('daily');
        const userId = interaction.user.id;
        
        const userData = await db.get(`user_${userId}`) || { level: 1, experience: 0 };

        if (isDailyTip) {
            await this.showDailyTip(interaction, userData);
        } else if (category) {
            await this.showCategoryTips(interaction, category, userData);
        } else {
            await this.showTipOverview(interaction, userData);
        }
    },

    async showTipOverview(interaction, userData) {
        const playerLevel = userData.level || 1;
        const tipCategories = this.getTipCategories();
        
        // Get personalized tip based on player progress
        const personalizedTip = this.getPersonalizedTip(userData);
        
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('💡 Treasure Hunter\'s Complete Guide')
            .setDescription('**Master the art of treasure hunting!**\n\nLearn from experienced adventurers and become a legendary treasure hunter.')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/guide-book.png')
            .addFields([
                { 
                    name: '🎯 Your Daily Tip', 
                    value: `*"${personalizedTip.tip}"*\n\n**Category:** ${personalizedTip.category}\n**Difficulty:** ${personalizedTip.difficulty}`, 
                    inline: false 
                },
                { 
                    name: '📚 Available Guides', 
                    value: tipCategories.map(cat => 
                        `${cat.emoji} **${cat.name}** (${cat.tips.length} tips)\n└ ${cat.description}`
                    ).join('\n\n'), 
                    inline: false 
                },
                { 
                    name: '📊 Your Progress', 
                    value: `**Level:** ${playerLevel}\n**Experience:** ${userData.experience || 0}\n**Skill Rating:** ${this.getSkillRating(userData)}`, 
                    inline: true 
                },
                { 
                    name: '🏆 Recommended Focus', 
                    value: this.getRecommendedFocus(userData), 
                    inline: true 
                }
            ])
            .setFooter({ text: 'Select a category below to dive deeper into specific strategies!' })
            .setTimestamp();

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('tips_category_select')
            .setPlaceholder('📚 Choose a tip category to explore...')
            .addOptions(
                tipCategories.map(cat => ({
                    label: cat.name,
                    description: `${cat.tips.length} tips • ${cat.difficulty}`,
                    value: cat.id,
                    emoji: cat.emoji
                }))
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tips_daily_personal')
                    .setLabel('Daily Personal Tip')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('tips_quick_start')
                    .setLabel('Quick Start Guide')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('tips_video_guides')
                    .setLabel('Video Tutorials')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📺'),
                new ButtonBuilder()
                    .setCustomId('tips_faq')
                    .setLabel('FAQ')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [
                new ActionRowBuilder().addComponents(categorySelect),
                actionButtons
            ]
        });
    },

    async showCategoryTips(interaction, category, userData) {
        const categoryData = this.getCategoryData(category);
        if (!categoryData) {
            return await interaction.reply({ content: '❌ Invalid category selected!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(categoryData.color)
            .setTitle(`${categoryData.emoji} ${categoryData.name}`)
            .setDescription(`**${categoryData.description}**\n\n${categoryData.subtitle}`)
            .setThumbnail(categoryData.thumbnail);

        // Add tips in organized sections
        categoryData.sections.forEach(section => {
            const tipList = section.tips.map((tip, index) => 
                `**${index + 1}.** ${tip.title}\n${tip.description}${tip.example ? `\n*Example: ${tip.example}*` : ''}`
            ).join('\n\n');

            embed.addFields({
                name: `${section.emoji} ${section.name}`,
                value: tipList,
                inline: false
            });
        });

        // Add difficulty rating and prerequisites
        embed.addFields([
            { 
                name: '📊 Difficulty Level', 
                value: `${this.getDifficultyStars(categoryData.difficulty)} ${categoryData.difficulty}\n**Prerequisites:** ${categoryData.prerequisites}`, 
                inline: true 
            },
            { 
                name: '⏱️ Time to Master', 
                value: `**Estimated:** ${categoryData.timeToMaster}\n**Practice Needed:** ${categoryData.practiceNeeded}`, 
                inline: true 
            }
        ]);

        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tips_back_overview')
                    .setLabel('← Back to Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`tips_practice_${category}`)
                    .setLabel('Practice Mode')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId(`tips_bookmark_${category}`)
                    .setLabel('Bookmark')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔖'),
                new ButtonBuilder()
                    .setCustomId('tips_next_category')
                    .setLabel('Next Category →')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [navigationButtons] });
    },

    async showDailyTip(interaction, userData) {
        const dailyTip = this.getDailyTip(userData, new Date());
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Your Personalized Daily Tip')
            .setDescription(`**Based on your Level ${userData.level || 1} progress**\n\nTailored advice to help you improve today!`)
            .addFields([
                { 
                    name: `${dailyTip.category.emoji} ${dailyTip.category.name}`, 
                    value: `*"${dailyTip.tip}"*`, 
                    inline: false 
                },
                { 
                    name: '🎯 Why This Matters', 
                    value: dailyTip.explanation, 
                    inline: false 
                },
                { 
                    name: '📋 Action Steps', 
                    value: dailyTip.actionSteps.map((step, i) => `**${i + 1}.** ${step}`).join('\n'), 
                    inline: false 
                },
                { 
                    name: '🏆 Expected Results', 
                    value: dailyTip.expectedResults, 
                    inline: true 
                },
                { 
                    name: '⏰ Time Investment', 
                    value: dailyTip.timeRequired, 
                    inline: true 
                }
            ])
            .setFooter({ text: 'Come back tomorrow for a new personalized tip!' })
            .setTimestamp();

        const tipButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tips_mark_completed')
                    .setLabel('Mark as Completed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('tips_need_help')
                    .setLabel('Need Help?')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🆘'),
                new ButtonBuilder()
                    .setCustomId('tips_share')
                    .setLabel('Share Tip')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📤'),
                new ButtonBuilder()
                    .setCustomId('tips_more_like_this')
                    .setLabel('More Like This')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        await interaction.reply({ embeds: [embed], components: [tipButtons] });
    },

    getTipCategories() {
        return [
            {
                id: 'beginner',
                name: 'Beginner Guide',
                emoji: '🌱',
                description: 'Essential knowledge for new treasure hunters',
                difficulty: 'Beginner',
                tips: [
                    // Beginner tips data
                ]
            },
            {
                id: 'combat',
                name: 'Combat Mastery',
                emoji: '⚔️',
                description: 'Battle strategies and combat techniques',
                difficulty: 'Intermediate',
                tips: [
                    // Combat tips data
                ]
            },
            {
                id: 'economy',
                name: 'Economic Mastery',
                emoji: '💰',
                description: 'Wealth building and resource management',
                difficulty: 'Intermediate',
                tips: [
                    // Economy tips data
                ]
            },
            {
                id: 'advanced',
                name: 'Advanced Strategy',
                emoji: '🎯',
                description: 'Complex strategies for experienced players',
                difficulty: 'Advanced',
                tips: [
                    // Advanced tips data
                ]
            },
            {
                id: 'pro',
                name: 'Pro Techniques',
                emoji: '🏆',
                description: 'Master-level techniques and secrets',
                difficulty: 'Expert',
                tips: [
                    // Pro tips data
                ]
            }
        ];
    },

    getCategoryData(category) {
        const categories = {
            beginner: {
                name: 'Beginner\'s Complete Guide',
                emoji: '🌱',
                color: '#2ECC71',
                description: 'Everything new treasure hunters need to know',
                subtitle: 'Start your adventure on the right foot!',
                thumbnail: 'https://cdn.discordapp.com/attachments/123456789/beginner-guide.png',
                difficulty: 'Beginner',
                prerequisites: 'None required',
                timeToMaster: '1-2 weeks',
                practiceNeeded: 'Daily play',
                sections: [
                    {
                        name: 'Getting Started',
                        emoji: '🚀',
                        tips: [
                            {
                                title: 'Claim Your Daily Rewards',
                                description: 'Use `/daily` command every day for free coins and items.',
                                example: 'Set a phone reminder for the same time each day'
                            },
                            {
                                title: 'Start in Safe Areas',
                                description: 'Begin treasure hunting in Village Square and Peaceful Meadow.',
                                example: 'These areas have no enemies and good learning opportunities'
                            },
                            {
                                title: 'Save Your Early Coins',
                                description: 'Don\'t spend everything immediately - save for better equipment.',
                                example: 'Aim to save 1000 coins before making major purchases'
                            }
                        ]
                    },
                    {
                        name: 'Essential Commands',
                        emoji: '⌨️',
                        tips: [
                            {
                                title: 'Learn Core Commands',
                                description: 'Master `/hunt`, `/profile`, `/inventory`, and `/shop` first.',
                                example: 'Use `/help` to see all available commands'
                            },
                            {
                                title: 'Check Your Stats Regularly',
                                description: 'Use `/stats` to track your progress and identify areas to improve.',
                                example: 'Check stats after each play session'
                            }
                        ]
                    }
                ]
            },
            combat: {
                name: 'Combat Mastery Guide',
                emoji: '⚔️',
                color: '#E74C3C',
                description: 'Become a formidable warrior and battle master',
                subtitle: 'Master the art of combat and emerge victorious!',
                thumbnail: 'https://cdn.discordapp.com/attachments/123456789/combat-guide.png',
                difficulty: 'Intermediate',
                prerequisites: 'Level 5+, Basic equipment',
                timeToMaster: '2-3 weeks',
                practiceNeeded: 'Regular arena battles',
                sections: [
                    {
                        name: 'Battle Fundamentals',
                        emoji: '🛡️',
                        tips: [
                            {
                                title: 'Know Your Enemy',
                                description: 'Study enemy patterns and weaknesses before engaging.',
                                example: 'Use `/scout` to gather information about enemies'
                            },
                            {
                                title: 'Equipment Balance',
                                description: 'Balance offense and defense - don\'t neglect armor.',
                                example: 'Aim for 60% offense, 40% defense equipment distribution'
                            }
                        ]
                    },
                    {
                        name: 'Advanced Tactics',
                        emoji: '🎯',
                        tips: [
                            {
                                title: 'Timing is Everything',
                                description: 'Learn when to attack, defend, or use special abilities.',
                                example: 'Save powerful attacks for when enemy defense is down'
                            }
                        ]
                    }
                ]
            }
            // Add more categories...
        };

        return categories[category];
    },

    getPersonalizedTip(userData) {
        const level = userData.level || 1;
        const experience = userData.experience || 0;
        
        // Logic to determine appropriate tip based on player progress
        if (level < 5) {
            return {
                tip: "Focus on daily rewards and safe area exploration to build your foundation.",
                category: "Foundation Building",
                difficulty: "Beginner"
            };
        } else if (level < 10) {
            return {
                tip: "Start investing in better equipment and try medium-difficulty areas.",
                category: "Equipment Upgrading",
                difficulty: "Intermediate"
            };
        } else {
            return {
                tip: "Consider specializing in specific skills and joining a guild for advanced content.",
                category: "Specialization",
                difficulty: "Advanced"
            };
        }
    },

    getDailyTip(userData, date) {
        // Generate consistent daily tip based on user data and date
        const tipIndex = (date.getDate() + (userData.level || 1)) % 30;
        
        return {
            tip: "Focus on completing daily challenges to maximize your experience gain.",
            category: { name: "Daily Optimization", emoji: "⭐" },
            explanation: "Daily challenges provide the best experience-to-time ratio and help maintain consistent progress.",
            actionSteps: [
                "Complete your daily treasure hunt",
                "Check for any special events or bonuses",
                "Review your progress and set tomorrow's goal"
            ],
            expectedResults: "15-25% faster leveling with consistent daily play",
            timeRequired: "15-20 minutes daily"
        };
    },

    getSkillRating(userData) {
        const level = userData.level || 1;
        if (level < 5) return "Novice ⭐";
        if (level < 10) return "Apprentice ⭐⭐";
        if (level < 15) return "Skilled ⭐⭐⭐";
        if (level < 20) return "Expert ⭐⭐⭐⭐";
        return "Master ⭐⭐⭐⭐⭐";
    },

    getRecommendedFocus(userData) {
        const level = userData.level || 1;
        if (level < 5) return "🎯 Daily rewards and basic exploration";
        if (level < 10) return "⚔️ Equipment upgrades and combat training";
        if (level < 15) return "🏛️ Guild joining and advanced areas";
        return "🏆 Mastery skills and legendary content";
    },

    getDifficultyStars(difficulty) {
        const stars = {
            'Beginner': '⭐',
            'Intermediate': '⭐⭐',
            'Advanced': '⭐⭐⭐',
            'Expert': '⭐⭐⭐⭐',
            'Master': '⭐⭐⭐⭐⭐'
        };
        return stars[difficulty] || '⭐';
    }
};
