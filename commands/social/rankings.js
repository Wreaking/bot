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
    }
};