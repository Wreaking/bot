const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const Player = require('../../game/Player');

const CHALLENGE_TYPES = {
    HUNT: {
        name: 'Treasure Hunt Race',
        description: 'Complete a treasure hunt faster than your opponent!',
        reward: 500
    },
    DUEL: {
        name: 'Adventurer\'s Duel',
        description: 'Battle with your equipment and stats!',
        reward: 300
    }
};

module.exports = {
    name: 'challenge',
    description: 'Challenge another user to a game',
    async execute(message, args) {
        try {
            const target = message.mentions.users.first();
            if (!target) {
                return message.reply('Please mention a user to challenge! Usage: `v!challenge <@user> <type>`');
            }

            if (target.id === message.author.id) {
                return message.reply('You can\'t challenge yourself!');
            }

            if (target.bot) {
                return message.reply('You can\'t challenge a bot!');
            }

            const type = (args[1] || 'hunt').toUpperCase();
            if (!CHALLENGE_TYPES[type]) {
                return message.reply(`Invalid challenge type! Available types: ${Object.keys(CHALLENGE_TYPES).join(', ')}`);
            }

            // Get player data
            const challenger = await db.getUser(message.author.id);
            const challenged = await db.getUser(target.id);

            if (!challenger || !challenged) {
                return message.reply('Both players need to have played before challenging!');
            }

            const challengerPlayer = new Player(message.author.id, challenger);
            const challengedPlayer = new Player(target.id, challenged);

            // Create challenge embed
            const embed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('⚔️ Challenge Issued!')
                .setDescription(`${message.author} has challenged ${target} to a ${CHALLENGE_TYPES[type].name}!`)
                .addFields(
                    { name: '📜 Type', value: CHALLENGE_TYPES[type].description },
                    { name: '💰 Reward', value: `${CHALLENGE_TYPES[type].reward} coins` },
                    { name: '⏳ Time', value: 'Challenge expires in 5 minutes' }
                )
                .setFooter({ text: `${target.username}, react with ✅ to accept or ❌ to decline` });

            const challengeMessage = await message.reply({ embeds: [embed] });
            await challengeMessage.react('✅');
            await challengeMessage.react('❌');

            // Create collector for reactions
            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && user.id === target.id;
            };

            const collector = challengeMessage.createReactionCollector({ filter, time: 300000 }); // 5 minutes

            collector.on('collect', async (reaction, user) => {
                if (reaction.emoji.name === '✅') {
                    // Handle challenge acceptance
                    if (type === 'HUNT') {
                        // Start hunt challenge
                        const challengeData = {
                            type: 'HUNT',
                            players: [message.author.id, target.id],
                            startTime: Date.now(),
                            completed: [],
                            reward: CHALLENGE_TYPES.HUNT.reward
                        };

                        await db.setChallengeData(message.channel.id, challengeData);

                        const startEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🏁 Hunt Challenge Started!')
                            .setDescription('First to complete their treasure hunt wins!')
                            .addFields(
                                { name: '🏆 Prize', value: `${CHALLENGE_TYPES.HUNT.reward} coins` },
                                { name: '📜 Instructions', value: 'Use `v!hunt` to start your hunt!' }
                            );

                        await message.channel.send({ embeds: [startEmbed] });
                    } else if (type === 'DUEL') {
                        // Calculate duel outcome based on equipment and stats
                        const challengerPower = calculatePower(challengerPlayer);
                        const challengedPower = calculatePower(challengedPlayer);

                        const winner = challengerPower > challengedPower ? message.author : target;
                        const winnerPlayer = winner.id === message.author.id ? challengerPlayer : challengedPlayer;

                        // Award prize
                        winnerPlayer.inventory.coins += CHALLENGE_TYPES.DUEL.reward;
                        await db.setUser(winner.id, {
                            ...winnerPlayer,
                            inventory: winnerPlayer.inventory
                        });

                        const duelEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('⚔️ Duel Results')
                            .setDescription(`${winner} has won the duel!`)
                            .addFields(
                                { 
                                    name: '⚔️ Power Levels', 
                                    value: `${message.author.username}: ${challengerPower}\n${target.username}: ${challengedPower}` 
                                },
                                { name: '💰 Reward', value: `${winner.username} won ${CHALLENGE_TYPES.DUEL.reward} coins!` }
                            );

                        await message.channel.send({ embeds: [duelEmbed] });
                    }
                } else {
                    // Handle challenge decline
                    const declineEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Challenge Declined')
                        .setDescription(`${target.username} has declined the challenge.`);

                    await message.channel.send({ embeds: [declineEmbed] });
                }

                collector.stop();
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⏰ Challenge Expired')
                        .setDescription('The challenge has expired without a response.');

                    message.channel.send({ embeds: [timeoutEmbed] });
                }
            });
        } catch (error) {
            console.error('Challenge command error:', error);
            return message.reply('There was an error processing the challenge. Please try again.');
        }
    }
};

function calculatePower(player) {
    let power = 0;
    
    // Base stats contribution
    power += player.stats.attack * 2;
    power += player.stats.defense * 1.5;
    power += player.stats.speed;
    power += player.stats.luck * 0.5;
    
    // Level bonus
    power += player.stats.level * 5;
    
    return Math.floor(power);
}
