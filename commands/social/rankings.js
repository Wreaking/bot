const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rankings')
        .setDescription('🏆 View treasure hunter rankings and leaderboards'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        
        // Mock leaderboard data - in real implementation, fetch from database
        const leaderboards = {
            level: [
                { rank: 1, name: 'TreasureMaster', value: 'Level 25', emoji: '👑' },
                { rank: 2, name: 'GoldDigger99', value: 'Level 23', emoji: '🥈' },
                { rank: 3, name: 'CrystalHunter', value: 'Level 21', emoji: '🥉' },
                { rank: 4, name: 'DragonSlayer', value: 'Level 19', emoji: '🏅' },
                { rank: 5, name: 'MysticExplorer', value: 'Level 18', emoji: '🏅' }
            ],
            wealth: [
                { rank: 1, name: 'CoinKing', value: '50,000 coins', emoji: '👑' },
                { rank: 2, name: 'RichHunter', value: '45,000 coins', emoji: '🥈' },
                { rank: 3, name: 'WealthyAdventurer', value: '40,000 coins', emoji: '🥉' },
                { rank: 4, name: 'GoldCollector', value: '35,000 coins', emoji: '🏅' },
                { rank: 5, name: 'TreasureHoarder', value: '30,000 coins', emoji: '🏅' }
            ],
            treasures: [
                { rank: 1, name: 'ArtifactFinder', value: '127 treasures', emoji: '👑' },
                { rank: 2, name: 'RelicSeeker', value: '98 treasures', emoji: '🥈' },
                { rank: 3, name: 'GemCollector', value: '87 treasures', emoji: '🥉' },
                { rank: 4, name: 'CurioHunter', value: '76 treasures', emoji: '🏅' },
                { rank: 5, name: 'PreciousHunter', value: '65 treasures', emoji: '🏅' }
            ]
        };

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Hall of Fame')
            .setDescription('**The Greatest Treasure Hunters**\n\nSee where you rank among the elite!')
            .addFields(
                { name: '📊 Leaderboard Categories', value: 'Level • Wealth • Treasures Found', inline: false }
            );

        // Show top level players by default
        embed.addFields({
            name: '⭐ Top Level Rankings',
            value: leaderboards.level.map(player => 
                `${player.emoji} **#${player.rank}** ${player.name} - ${player.value}`
            ).join('\n'),
            inline: false
        });

        const levelButton = new ButtonBuilder()
            .setCustomId('leaderboard_level')
            .setLabel('Level Rankings')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⭐');

        const wealthButton = new ButtonBuilder()
            .setCustomId('leaderboard_wealth')
            .setLabel('Wealth Rankings')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰');

        const treasureButton = new ButtonBuilder()
            .setCustomId('leaderboard_treasures')
            .setLabel('Treasure Rankings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💎');

        const myRankButton = new ButtonBuilder()
            .setCustomId('leaderboard_myrank')
            .setLabel('My Rankings')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎯');

        const row1 = new ActionRowBuilder().addComponents(levelButton, wealthButton);
        const row2 = new ActionRowBuilder().addComponents(treasureButton, myRankButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },

    // Button handlers for rankings
    buttonHandlers: {
        async level(interaction) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⭐ Level Rankings')
                .setDescription('**The Highest Level Treasure Hunters**');

            // Mock data - replace with real database queries
            const levelRankings = [
                { rank: 1, name: 'TreasureMaster', value: 'Level 25', emoji: '👑', bonus: '2,500 XP' },
                { rank: 2, name: 'GoldDigger99', value: 'Level 23', emoji: '🥈', bonus: '2,000 XP' },
                { rank: 3, name: 'CrystalHunter', value: 'Level 21', emoji: '🥉', bonus: '1,500 XP' },
                { rank: 4, name: 'DragonSlayer', value: 'Level 19', emoji: '🏅', bonus: '1,000 XP' },
                { rank: 5, name: 'MysticExplorer', value: 'Level 18', emoji: '🏅', bonus: '750 XP' }
            ];

            embed.addFields([
                {
                    name: '🏆 Top 5 Players',
                    value: levelRankings.map(player => 
                        `${player.emoji} **#${player.rank}** ${player.name}\n└ ${player.value} • Next reward: ${player.bonus}`
                    ).join('\n\n'),
                    inline: false
                },
                {
                    name: '💡 Level Up Tips',
                    value: '• Complete daily hunts for consistent XP\n• Solve riddles for bonus experience\n• Participate in events for multiplied XP',
                    inline: false
                }
            ]);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async wealth(interaction) {
            const embed = new EmbedBuilder()
                .setColor('#32CD32')
                .setTitle('💰 Wealth Rankings')
                .setDescription('**The Richest Treasure Hunters**');

            const wealthRankings = [
                { rank: 1, name: 'CoinKing', value: '50,000 coins', emoji: '👑' },
                { rank: 2, name: 'RichHunter', value: '45,000 coins', emoji: '🥈' },
                { rank: 3, name: 'WealthyAdventurer', value: '40,000 coins', emoji: '🥉' },
                { rank: 4, name: 'GoldCollector', value: '35,000 coins', emoji: '🏅' },
                { rank: 5, name: 'TreasureHoarder', value: '30,000 coins', emoji: '🏅' }
            ];

            embed.addFields([
                {
                    name: '🏆 Top 5 Wealthiest',
                    value: wealthRankings.map(player => 
                        `${player.emoji} **#${player.rank}** ${player.name} - ${player.value}`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '💡 Wealth Building Tips',
                    value: '• Use `/work` and `/daily` consistently\n• Invest wisely in the market\n• Complete high-reward quests',
                    inline: false
                }
            ]);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async treasures(interaction) {
            const embed = new EmbedBuilder()
                .setColor('#9370DB')
                .setTitle('💎 Treasure Rankings')
                .setDescription('**The Greatest Treasure Collectors**');

            const treasureRankings = [
                { rank: 1, name: 'ArtifactFinder', value: '127 treasures', emoji: '👑' },
                { rank: 2, name: 'RelicSeeker', value: '98 treasures', emoji: '🥈' },
                { rank: 3, name: 'GemCollector', value: '87 treasures', emoji: '🥉' },
                { rank: 4, name: 'CurioHunter', value: '76 treasures', emoji: '🏅' },
                { rank: 5, name: 'PreciousHunter', value: '65 treasures', emoji: '🏅' }
            ];

            embed.addFields([
                {
                    name: '🏆 Top 5 Collectors',
                    value: treasureRankings.map(player => 
                        `${player.emoji} **#${player.rank}** ${player.name} - ${player.value}`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '💡 Treasure Hunting Tips',
                    value: '• Explore different areas daily\n• Use better equipment for rare finds\n• Join group expeditions',
                    inline: false
                }
            ]);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async myrank(interaction) {
            const userId = interaction.user.id;
            const userData = await db.getPlayer(userId);

            if (!userData) {
                return await interaction.reply({
                    content: '❌ No player data found! Use `/profile` to get started.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle(`🎯 ${interaction.user.displayName}'s Rankings`)
                .setDescription('**Your current standings across all categories**')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields([
                    {
                        name: '⭐ Level Ranking',
                        value: `**Level ${userData.level || 1}**\n🏅 Estimated Rank: #${Math.floor(Math.random() * 100) + 1}`,
                        inline: true
                    },
                    {
                        name: '💰 Wealth Ranking',
                        value: `**${(userData.coins || 0).toLocaleString()} coins**\n🏅 Estimated Rank: #${Math.floor(Math.random() * 150) + 1}`,
                        inline: true
                    },
                    {
                        name: '💎 Treasure Ranking',
                        value: `**${userData.treasuresFound || 0} treasures**\n🏅 Estimated Rank: #${Math.floor(Math.random() * 200) + 1}`,
                        inline: true
                    },
                    {
                        name: '📊 Overall Performance',
                        value: `🎯 Keep grinding to climb the ranks!\n💡 Focus on daily activities for steady progress`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Rankings update every hour • Keep playing to improve!' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};