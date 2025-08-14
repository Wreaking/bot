const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { ItemManager } = require('../../game/Items');
const Player = require('../../game/Player');

const itemManager = new ItemManager();

module.exports = {
    name: 'unequip',
    description: 'Unequip an item from a specific equipment slot',
    execute: async (message, args) => {
        try {
            if (!args.length) {
                return message.reply('Please specify a slot to unequip! Usage: `v!unequip <slot>`. Valid slots are: weapon, armor, accessory');
            }

            const slot = args[0].toLowerCase();
            if (!['weapon', 'armor', 'accessory'].includes(slot)) {
                return message.reply('❌ Invalid slot! Valid slots are: weapon, armor, accessory');
            }

            // Get user data
            let userData = await db.getUser(message.author.id);
            if (!userData) {
                return message.reply('❌ You don\'t have any equipment!');
            }

            const player = new Player(message.author.id, userData);

            // Check if there's an item equipped in that slot
            if (!player.equipment[slot]) {
                return message.reply(`❌ You don't have anything equipped in your ${slot} slot!`);
            }

            const oldItemId = player.equipment[slot];
            const oldItem = itemManager.getItem(oldItemId);

            // Try to unequip the item
            if (player.unequipItem(slot)) {
                // Update user data in database
                await db.setUser(message.author.id, {
                    ...userData,
                    inventory: player.inventory,
                    equipment: player.equipment,
                    stats: player.stats
                });

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Item Unequipped')
                    .setDescription(`Successfully unequipped **${oldItem.name}** from ${slot} slot!`)
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
                                .map(([equipSlot, equippedId]) => {
                                    if (!equippedId) return `${equipSlot}: None`;
                                    const equippedItem = itemManager.getItem(equippedId);
                                    return `${equipSlot}: ${equippedItem ? equippedItem.name : 'Unknown'}`;
                                })
                                .join('\n'),
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Item has been returned to your inventory' });

                return message.reply({ embeds: [embed] });
            } else {
                return message.reply('❌ Failed to unequip the item. Please try again.');
            }
        } catch (error) {
            console.error('Unequip command error:', error);
            return message.reply('There was an error unequipping the item. Please try again.');
        }
    }
};
