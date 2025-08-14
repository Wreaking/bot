const { EmbedBuilder } = require('discord.js');
const db = require('../database');
const { ItemManager } = require('../game/Items');
const Player = require('../game/Player');

const itemManager = new ItemManager();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            const [action, ...args] = interaction.customId.split('_');

            switch (action) {
                case 'shop': {
                    const category = args[0];
                    const userData = await db.getUser(interaction.user.id) || {
                        inventory: { coins: 100, items: [] }
                    };

                    const items = itemManager.getAllItems().filter(item => 
                        category === 'all' || item.type === category
                    );

                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🏪 Shop - ' + category.charAt(0).toUpperCase() + category.slice(1))
                        .setDescription(`Your Balance: ${userData.inventory.coins} coins`)
                        .addFields(
                            items.map(item => ({
                                name: `${item.name} (${item.id})`,
                                value: `💰 ${item.price} coins\n${item.description}\n${
                                    item.stats ? `Stats: ${Object.entries(item.stats)
                                        .map(([stat, value]) => `${stat}: ${value}`)
                                        .join(', ')}` : ''
                                }`,
                                inline: false
                            }))
                        )
                        .setFooter({ text: 'Use v!buy <item_id> to purchase' });

                    await interaction.update({ embeds: [embed] });
                    break;
                }

                case 'page': {
                    // Handle pagination for long lists
                    const page = parseInt(args[0]);
                    const type = args[1];
                    
                    // Implementation depends on what's being paginated
                    // This is a placeholder for pagination logic
                    break;
                }

                case 'hunt': {
                    const huntAction = args[0];
                    const huntData = await db.getHunt(interaction.user.id);

                    if (!huntData || !huntData.active) {
                        await interaction.reply({
                            content: 'You don\'t have an active hunt!',
                            ephemeral: true
                        });
                        return;
                    }

                    switch (huntAction) {
                        case 'hint': {
                            if (!huntData.currentClue.hint) {
                                await interaction.reply({
                                    content: 'No hint available for this clue!',
                                    ephemeral: true
                                });
                                return;
                            }

                            await interaction.reply({
                                content: `Hint: ${huntData.currentClue.hint}`,
                                ephemeral: true
                            });
                            break;
                        }

                        case 'skip': {
                            // Implement skip logic
                            break;
                        }
                    }
                    break;
                }

                case 'refresh': {
                    // Handle refresh requests
                    await interaction.message.fetch();
                    await interaction.update({ content: 'Content refreshed!' });
                    break;
                }
            }
        } catch (error) {
            console.error('Button interaction error:', error);
            const errorMsg = 'There was an error processing your request.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMsg, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};
