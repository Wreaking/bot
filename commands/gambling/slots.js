const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Try your luck at the slot machine')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(1000)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const bet = interaction.options.getInteger('bet');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            if (player.coins < bet) {
                await interaction.editReply({
                    content: `❌ You don't have enough coins! You need ${bet} coins.`,
                    ephemeral: true
                });
                return;
            }

            // Define slot symbols and their payouts
            const symbols = [
                { emoji: '🍒', value: 2 },   // Cherries
                { emoji: '🍋', value: 3 },   // Lemon
                { emoji: '🍊', value: 4 },   // Orange
                { emoji: '🍇', value: 5 },   // Grapes
                { emoji: '💎', value: 10 },  // Diamond
                { emoji: '7️⃣', value: 15 }   // Seven
            ];

            // Generate random results
            const result = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);

            // Calculate winnings
            let winMultiplier = 0;
            if (result[0].emoji === result[1].emoji && result[1].emoji === result[2].emoji) {
                // All three match
                winMultiplier = result[0].value;
            } else if (result[0].emoji === result[1].emoji || result[1].emoji === result[2].emoji) {
                // Two adjacent symbols match
                winMultiplier = Math.floor(result[1].value / 2);
            }

            const winnings = bet * winMultiplier;
            const netGain = winnings - bet;

            // Update player's coins
            player.coins += netGain;

            // Update gambling stats
            if (!player.gambling) {
                player.gambling = {
                    totalBet: 0,
                    totalWon: 0,
                    gamesPlayed: 0,
                    biggestWin: 0
                };
            }

            player.gambling.totalBet += bet;
            player.gambling.totalWon += winnings;
            player.gambling.gamesPlayed += 1;
            if (winnings > (player.gambling.biggestWin || 0)) {
                player.gambling.biggestWin = winnings;
            }

            await db.updatePlayer(userId, player);

            // Create spinning animation
            const spinEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎰 Slot Machine')
                .setDescription('Spinning...\n❓ | ❓ | ❓');

            const response = await interaction.editReply({ embeds: [spinEmbed] });

            // Wait for dramatic effect
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show result
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎰 Slot Machine')
                .setDescription(`${result[0].emoji} | ${result[1].emoji} | ${result[2].emoji}`)
                .addFields(
                    { name: 'Bet', value: `${bet} coins`, inline: true },
                    { name: 'Winnings', value: `${winnings} coins`, inline: true },
                    { name: 'Net Gain/Loss', value: `${netGain > 0 ? '+' : ''}${netGain} coins`, inline: true }
                );

            if (winnings > 0) {
                resultEmbed.setColor('#00FF00');
                if (winnings >= bet * 5) {
                    resultEmbed.addFields({
                        name: '🎉 Big Win!',
                        value: 'Congratulations on hitting a major prize!',
                        inline: false
                    });
                }
            } else {
                resultEmbed.setColor('#FF0000');
            }

            // Add gambling stats
            resultEmbed.addFields({
                name: '📊 Your Gambling Stats',
                value: `Games Played: ${player.gambling.gamesPlayed}\nBiggest Win: ${player.gambling.biggestWin}\nTotal Wagered: ${player.gambling.totalBet}\nTotal Won: ${player.gambling.totalWon}`,
                inline: false
            });

            // Add play again button
            const playAgain = new ButtonBuilder()
                .setCustomId('slots_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎰');

            const row = new ActionRowBuilder()
                .addComponents(playAgain);

            await interaction.editReply({
                embeds: [resultEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('Error in slots command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while playing slots.',
                ephemeral: true
            });
        }
    },
};
