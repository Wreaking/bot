const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('🎲 Play roulette')
        .addStringOption(option =>
            option.setName('bet_type')
                .setDescription('Type of bet to place')
                .setRequired(true)
                .addChoices(
                    { name: 'Red/Black', value: 'color' },
                    { name: 'Even/Odd', value: 'parity' },
                    { name: 'High/Low', value: 'range' },
                    { name: 'Single Number', value: 'number' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(1000))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your bet choice')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const betType = interaction.options.getString('bet_type');
            const bet = interaction.options.getInteger('bet');
            let choice = interaction.options.getString('choice').toLowerCase();
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

            // Validate choice based on bet type
            const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            let validChoice = false;
            let payoutMultiplier = 0;

            switch (betType) {
                case 'color':
                    if (['red', 'black'].includes(choice)) {
                        validChoice = true;
                        payoutMultiplier = 2;
                    }
                    break;
                case 'parity':
                    if (['even', 'odd'].includes(choice)) {
                        validChoice = true;
                        payoutMultiplier = 2;
                    }
                    break;
                case 'range':
                    if (['high', 'low'].includes(choice)) {
                        validChoice = true;
                        payoutMultiplier = 2;
                    }
                    break;
                case 'number':
                    const num = parseInt(choice);
                    if (!isNaN(num) && num >= 0 && num <= 36) {
                        choice = num;
                        validChoice = true;
                        payoutMultiplier = 35;
                    }
                    break;
            }

            if (!validChoice) {
                await interaction.editReply({
                    content: '❌ Invalid choice for this bet type!',
                    ephemeral: true
                });
                return;
            }

            // Spin the wheel
            const result = Math.floor(Math.random() * 37); // 0-36

            // Determine if player won
            let won = false;
            switch (betType) {
                case 'color':
                    const isRed = redNumbers.includes(result);
                    won = (choice === 'red' && isRed) || (choice === 'black' && !isRed && result !== 0);
                    break;
                case 'parity':
                    won = (choice === 'even' && result % 2 === 0 && result !== 0) || 
                          (choice === 'odd' && result % 2 === 1);
                    break;
                case 'range':
                    won = (choice === 'high' && result >= 19 && result !== 0) || 
                          (choice === 'low' && result <= 18 && result !== 0);
                    break;
                case 'number':
                    won = result === choice;
                    break;
            }

            // Calculate winnings
            const winnings = won ? bet * payoutMultiplier : 0;
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
                .setTitle('🎲 Roulette')
                .setDescription('The wheel is spinning...');

            const response = await interaction.editReply({ embeds: [spinEmbed] });

            // Wait for dramatic effect
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show result
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎲 Roulette Results')
                .setDescription(`The ball landed on ${result} ${redNumbers.includes(result) ? '🔴' : '⚫'}`)
                .addFields(
                    { name: 'Your Bet', value: `${bet} coins on ${choice}`, inline: true },
                    { name: 'Outcome', value: won ? '🎉 Won!' : '❌ Lost', inline: true },
                    { name: 'Winnings', value: `${winnings} coins`, inline: true },
                    { name: 'Net Gain/Loss', value: `${netGain > 0 ? '+' : ''}${netGain} coins`, inline: true }
                );

            if (won) {
                resultEmbed.setColor('#00FF00');
                if (betType === 'number') {
                    resultEmbed.addFields({
                        name: '🎉 Incredible!',
                        value: 'You hit the exact number!',
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
                .setCustomId('roulette_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎲');

            const row = new ActionRowBuilder()
                .addComponents(playAgain);

            await interaction.editReply({
                embeds: [resultEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('Error in roulette command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while playing roulette.',
                ephemeral: true
            });
        }
    },
};
