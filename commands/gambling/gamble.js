const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Try your luck with various gambling games!')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Choose gambling game')
                .setRequired(false)
                .addChoices(
                    { name: '🎰 Slot Machine', value: 'slots' },
                    { name: '🎲 Dice Roll', value: 'dice' },
                    { name: '🃏 Blackjack', value: 'blackjack' },
                    { name: '🎯 Coin Flip', value: 'coinflip' },
                    { name: '🎡 Roulette', value: 'roulette' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (minimum 10 coins)')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(10000)),
    
    async execute(interaction) {
        const game = interaction.options?.getString('game') || 'slots';
        const bet = interaction.options?.getInteger('bet') || 50;
        const userId = interaction.user.id;
        
        const userData = await db.getPlayer(userId) || { inventory: { coins: 0 } };
        const coins = userData.inventory?.coins || 0;
        
        // Check if user has enough coins
        if (coins < bet) {
            return interaction.reply({
                content: `❌ You need ${bet} coins to play! You have ${coins} coins. Use \`/daily\` to earn more coins.`,
                ephemeral: true
            });
        }
        
        // Check cooldown
        const lastGamble = userData.cooldowns?.gambling || 0;
        const cooldownTime = 10000; // 10 seconds
        const timeSinceLastGamble = Date.now() - lastGamble;
        
        if (timeSinceLastGamble < cooldownTime) {
            const timeLeft = Math.ceil((cooldownTime - timeSinceLastGamble) / 1000);
            return interaction.reply({
                content: `🎰 Slow down! Wait ${timeLeft} seconds before gambling again.`,
                ephemeral: true
            });
        }
        
        // Play the selected game
        let result;
        switch (game) {
            case 'slots':
                result = this.playSlots(bet);
                break;
            case 'dice':
                result = this.playDice(bet);
                break;
            case 'blackjack':
                result = this.playBlackjack(bet);
                break;
            case 'coinflip':
                result = this.playCoinFlip(bet);
                break;
            case 'roulette':
                result = this.playRoulette(bet);
                break;
            default:
                result = this.playSlots(bet);
        }
        
        // Update user data
        const netGain = result.winnings - bet;
        userData.inventory.coins = coins + netGain;
        userData.cooldowns = userData.cooldowns || {};
        userData.cooldowns.gambling = Date.now();
        
        // Update gambling statistics
        if (!userData.stats) userData.stats = {};
        userData.stats.totalGambled = (userData.stats.totalGambled || 0) + bet;
        userData.stats.totalWon = (userData.stats.totalWon || 0) + result.winnings;
        userData.stats.gamblingGames = (userData.stats.gamblingGames || 0) + 1;
        
        if (result.won) {
            userData.stats.gamblingWins = (userData.stats.gamblingWins || 0) + 1;
            userData.stats.biggestWin = Math.max(userData.stats.biggestWin || 0, result.winnings);
        }
        
        await db.setUser(userId, userData);
        
        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(result.won ? config.embedColors.success : config.embedColors.error)
            .setTitle(`🎰 ${result.gameTitle}`)
            .setDescription(result.description)
            .addFields([
                { name: '💰 Bet Amount', value: `${bet} coins`, inline: true },
                { name: result.won ? '🎉 Winnings' : '💸 Lost', value: `${result.winnings} coins`, inline: true },
                { name: '📊 Net Result', value: `${netGain >= 0 ? '+' : ''}${netGain} coins`, inline: true },
                { name: '💳 New Balance', value: `${userData.inventory.coins} coins`, inline: true },
                { name: '🎮 Result', value: result.details, inline: true },
                { name: '🎯 Outcome', value: result.won ? '**YOU WON!** 🎉' : '**You Lost** 😔', inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        // Add gambling tips
        const tips = [
            '💡 Set a budget and stick to it!',
            '🎯 Know when to walk away',
            '📈 Gambling is entertainment, not investment',
            '🍀 Remember: the house always has an edge',
            '⏰ Take breaks between games'
        ];
        
        embed.setFooter({ text: tips[Math.floor(Math.random() * tips.length)] });
        
        // Add special messages
        if (result.jackpot) {
            embed.addFields([
                { name: '🎊 JACKPOT!', value: 'You hit the jackpot! Amazing luck!', inline: false }
            ]);
        }
        
        if (netGain >= bet * 5) {
            embed.addFields([
                { name: '🔥 Big Win!', value: 'Incredible! You multiplied your bet significantly!', inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`gamble_${game}_${bet}`)
                    .setLabel(`🎰 Play ${result.gameTitle} Again`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(userData.inventory.coins < bet),
                new ButtonBuilder()
                    .setCustomId('gambling_stats')
                    .setLabel('📊 Gambling Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('gambling_help')
                    .setLabel('❓ Game Rules')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('daily_claim')
                    .setLabel('💰 Earn More Coins')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    playSlots(bet) {
        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🔔'];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
        
        let winnings = 0;
        let won = false;
        let jackpot = false;
        
        // Check for wins
        if (reel1 === reel2 && reel2 === reel3) {
            // Three of a kind
            won = true;
            if (reel1 === '💎') {
                winnings = bet * 50; // Diamond jackpot
                jackpot = true;
            } else if (reel1 === '7️⃣') {
                winnings = bet * 25; // Lucky 7s
            } else if (reel1 === '⭐') {
                winnings = bet * 15; // Stars
            } else {
                winnings = bet * 10; // Other three of a kind
            }
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            // Two of a kind
            won = true;
            winnings = bet * 2;
        }
        
        return {
            gameTitle: 'Slot Machine',
            description: `**${reel1} | ${reel2} | ${reel3}**`,
            details: won ? (jackpot ? 'JACKPOT! Three diamonds!' : 'Matching symbols!') : 'No matches',
            won,
            winnings,
            jackpot
        };
    },
    
    playDice(bet) {
        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const houseRoll = Math.floor(Math.random() * 6) + 1;
        
        let winnings = 0;
        let won = false;
        
        if (playerRoll > houseRoll) {
            won = true;
            if (playerRoll === 6 && houseRoll === 1) {
                winnings = bet * 6; // Maximum difference
            } else {
                winnings = bet * 2;
            }
        } else if (playerRoll === houseRoll) {
            winnings = bet; // Tie - return bet
        }
        
        return {
            gameTitle: 'Dice Battle',
            description: `🎲 You rolled **${playerRoll}** vs House **${houseRoll}**`,
            details: playerRoll > houseRoll ? 'Your dice won!' : playerRoll === houseRoll ? 'Tie game!' : 'House dice won',
            won: playerRoll >= houseRoll,
            winnings
        };
    },
    
    playBlackjack(bet) {
        const drawCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
        
        const playerCard1 = drawCard();
        const playerCard2 = drawCard();
        const playerTotal = playerCard1 + playerCard2;
        
        const dealerCard = drawCard();
        const dealerHidden = drawCard();
        const dealerTotal = dealerCard + dealerHidden;
        
        let winnings = 0;
        let won = false;
        
        if (playerTotal === 21) {
            won = true;
            winnings = bet * 3; // Blackjack pays 3:2
        } else if (playerTotal > 21) {
            // Player bust
            won = false;
        } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
            won = true;
            winnings = bet * 2;
        } else if (playerTotal === dealerTotal) {
            winnings = bet; // Push
        }
        
        return {
            gameTitle: 'Blackjack',
            description: `🃏 Your cards: **${playerCard1} + ${playerCard2} = ${playerTotal}**\n🏠 Dealer: **${dealerCard} + ? = ${dealerTotal}** (revealed)`,
            details: playerTotal === 21 ? 'Blackjack!' : playerTotal > 21 ? 'Bust!' : dealerTotal > 21 ? 'Dealer bust!' : `${playerTotal} vs ${dealerTotal}`,
            won: playerTotal <= 21 && (dealerTotal > 21 || playerTotal >= dealerTotal),
            winnings
        };
    },
    
    playCoinFlip(bet) {
        const userChoice = Math.random() < 0.5 ? 'heads' : 'tails';
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = userChoice === result;
        
        return {
            gameTitle: 'Coin Flip',
            description: `🪙 You called **${userChoice}** and the coin landed on **${result}**`,
            details: won ? 'Perfect prediction!' : 'Wrong guess!',
            won,
            winnings: won ? bet * 2 : 0
        };
    },
    
    playRoulette(bet) {
        const number = Math.floor(Math.random() * 37); // 0-36
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
        const isBlack = number !== 0 && !isRed;
        const isEven = number !== 0 && number % 2 === 0;
        const isOdd = number !== 0 && number % 2 === 1;
        
        // Simple betting on red/black
        const userBet = Math.random() < 0.5 ? 'red' : 'black';
        const won = (userBet === 'red' && isRed) || (userBet === 'black' && isBlack);
        
        const color = number === 0 ? 'green' : isRed ? 'red' : 'black';
        
        return {
            gameTitle: 'Roulette',
            description: `🎡 Ball landed on **${number}** (${color})\nYou bet on **${userBet}**`,
            details: number === 0 ? 'House wins (green 0)!' : won ? `${color} wins!` : `${color} loses!`,
            won: won && number !== 0,
            winnings: won && number !== 0 ? bet * 2 : 0
        };
    }
};