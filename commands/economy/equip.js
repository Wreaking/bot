const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { ItemManager } = require('../../game/Items');
const Player = require('../../game/Player');

const itemManager = new ItemManager();

module.exports = {
    name: 'equip',
    description: 'Equip an item from your inventory',
    execute: async (message, args) => {
        try {
            if (!args.length) {
                return message.reply('Please specify an item to equip! Usage: `v!equip <item_id>`');
            }

            const itemId = args[0].toLowerCase();
            const item = itemManager.getItem(itemId);

            if (!item) {
                return message.reply('❌ Invalid item ID! Check `v!shop` for available items.');
            }

            // Get user data
            let userData = await db.getUser(message.author.id);
            if (!userData) {
                return message.reply('❌ You don\'t have any items! Check `v!shop` to buy some.');
            }

            const player = new Player(message.author.id, userData);

            // Check if player has the item
            if (!player.hasItem(itemId)) {
                return message.reply('❌ You don\'t own this item! Check `v!shop` to buy it.');
            }

            // Try to equip the item
            if (player.equipItem(itemId)) {
                // Update user data in database
                await db.setUser(message.author.id, {
                    ...userData,
                    inventory: player.inventory,
                    equipment: player.equipment,
                    stats: player.stats
                });

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Item Equipped')
                    .setDescription(`Successfully equipped **${item.name}**!`)
                    .addFields(
                        { 
                            name: '📊 Updated Stats', 
                            value: Object.entries(player.stats)
                                .map(([stat, value]) => `${stat}: ${value}`)
                                .join('\n'),
                            inline: true 
                        },
                        {
                            name: '⚔️ Current Equipment',
                            value: Object.entries(player.equipment)
                                .map(([slot, equippedId]) => {
                                    if (!equippedId) return `${slot}: None`;
                                    const equippedItem = itemManager.getItem(equippedId);
                                    return `${slot}: ${equippedItem ? equippedItem.name : 'Unknown'}`;
                                })
                                .join('\n'),
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Use v!unequip <slot> to unequip items' });

                return message.reply({ embeds: [embed] });
            } else {
                return message.reply('❌ This item cannot be equipped! Only weapons, armor, and accessories can be equipped.');
            }
        } catch (error) {
            console.error('Equip command error:', error);
            return message.reply('There was an error equipping the item. Please try again.');
        }
    }
};
