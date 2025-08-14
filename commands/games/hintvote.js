const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

const HINT_COST = 50; // Coins per hint vote
const REQUIRED_VOTES = 3; // Number of votes needed to reveal hint

module.exports = {
    name: 'hintvote',
    description: 'Vote to reveal a hint for the current treasure hunt',
    async execute(message, args) {
        try {
            // Check if there's an active hunt in the channel
            const hunt = await db.getHunt(message.author.id);
            if (!hunt || !hunt.active) {
                return message.reply('There is no active treasure hunt! Start one with `v!hunt`');
            }

            // Get user data
            let userData = await db.getUser(message.author.id);
            if (!userData || userData.inventory.coins < HINT_COST) {
                return message.reply(`You need ${HINT_COST} coins to vote for a hint!`);
            }

            // Check if user already voted
            const hintVotes = hunt.hintVotes || [];
            if (hintVotes.includes(message.author.id)) {
                return message.reply('You have already voted for a hint!');
            }

            // Add vote and deduct coins
            userData.inventory.coins -= HINT_COST;
            await db.setUser(message.author.id, userData);

            hintVotes.push(message.author.id);
            hunt.hintVotes = hintVotes;
            await db.setHunt(message.author.id, hunt);

            if (hintVotes.length >= REQUIRED_VOTES) {
                // Reveal hint
                const hint = hunt.currentClue.hint || 'No additional hint available.';
                
                const hintEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🔍 Hint Revealed!')
                    .setDescription('Enough votes have been gathered to reveal the hint!')
                    .addFields(
                        { name: '📜 Current Clue', value: hunt.currentClue.text },
                        { name: '💡 Hint', value: hint }
                    )
                    .setFooter({ text: 'Good luck solving the clue!' });

                // Reset votes
                hunt.hintVotes = [];
                await db.setHunt(message.author.id, hunt);

                return message.channel.send({ embeds: [hintEmbed] });
            } else {
                // Show vote progress
                const progressEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🗳️ Hint Vote')
                    .setDescription(`${message.author.username} has voted to reveal a hint!`)
                    .addFields(
                        { 
                            name: '📊 Progress', 
                            value: `${hintVotes.length}/${REQUIRED_VOTES} votes\n${'🟢'.repeat(hintVotes.length)}${'⚫'.repeat(REQUIRED_VOTES - hintVotes.length)}` 
                        },
                        { 
                            name: '💰 Cost', 
                            value: `${HINT_COST} coins per vote` 
                        }
                    )
                    .setFooter({ text: `Use v!hintvote to add your vote! ${REQUIRED_VOTES - hintVotes.length} more needed!` });

                return message.reply({ embeds: [progressEmbed] });
            }
        } catch (error) {
            console.error('Hint vote command error:', error);
            return message.reply('There was an error processing your vote. Please try again.');
        }
    }
};
