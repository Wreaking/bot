const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'manage',
    description: 'Admin commands for managing the game',
    async execute(message, args) {
        // Check if user has admin permissions
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You need Administrator permissions to use this command!');
        }

        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🛠️ Admin Management Commands')
                .setDescription('Available management commands:')
                .addFields(
                    { 
                        name: 'Economy Management', 
                        value: [
                            '`v!manage give <@user> <coins>` - Give coins to a user',
                            '`v!manage take <@user> <coins>` - Take coins from a user',
                            '`v!manage reset <@user>` - Reset a user\'s economy'
                        ].join('\n')
                    },
                    {
                        name: 'Hunt Management',
                        value: [
                            '`v!manage clearhunt <@user>` - Clear a user\'s active hunt',
                            '`v!manage resetprogress <@user>` - Reset a user\'s hunt progress'
                        ].join('\n')
                    }
                );

            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();
        const target = message.mentions.users.first();
        
        if (!target && !['help'].includes(subcommand)) {
            return message.reply('❌ Please mention a user to manage!');
        }

        try {
            switch (subcommand) {
                case 'give': {
                    const amount = parseInt(args[2]);
                    if (isNaN(amount) || amount <= 0) {
                        return message.reply('❌ Please specify a valid amount of coins!');
                    }

                    let userData = await db.getUser(target.id) || {
                        inventory: { coins: 0, items: [] }
                    };
                    
                    userData.inventory.coins += amount;
                    await db.setUser(target.id, userData);

                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('💰 Coins Added')
                        .setDescription(`Added ${amount} coins to ${target.username}'s balance`)
                        .addFields(
                            { name: 'New Balance', value: `${userData.inventory.coins} coins` }
                        );

                    return message.reply({ embeds: [embed] });
                }

                case 'take': {
                    const amount = parseInt(args[2]);
                    if (isNaN(amount) || amount <= 0) {
                        return message.reply('❌ Please specify a valid amount of coins!');
                    }

                    let userData = await db.getUser(target.id);
                    if (!userData || !userData.inventory) {
                        return message.reply('❌ User has no coins to take!');
                    }

                    userData.inventory.coins = Math.max(0, userData.inventory.coins - amount);
                    await db.setUser(target.id, userData);

                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('💰 Coins Removed')
                        .setDescription(`Removed ${amount} coins from ${target.username}'s balance`)
                        .addFields(
                            { name: 'New Balance', value: `${userData.inventory.coins} coins` }
                        );

                    return message.reply({ embeds: [embed] });
                }

                case 'reset': {
                    await db.setUser(target.id, {
                        inventory: {
                            coins: 100,
                            xp: 0,
                            items: []
                        },
                        stats: {
                            level: 1,
                            huntsCompleted: 0,
                            treasuresFound: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🔄 Account Reset')
                        .setDescription(`Reset ${target.username}'s account to default values`);

                    return message.reply({ embeds: [embed] });
                }

                case 'clearhunt': {
                    await db.deleteHunt(target.id);

                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🗑️ Hunt Cleared')
                        .setDescription(`Cleared ${target.username}'s active hunt`);

                    return message.reply({ embeds: [embed] });
                }

                case 'resetprogress': {
                    let userData = await db.getUser(target.id);
                    if (userData) {
                        userData.stats = {
                            ...userData.stats,
                            huntsCompleted: 0,
                            treasuresFound: 0
                        };
                        await db.setUser(target.id, userData);
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🔄 Progress Reset')
                        .setDescription(`Reset ${target.username}'s hunt progress`);

                    return message.reply({ embeds: [embed] });
                }

                default:
                    return message.reply('❌ Unknown subcommand! Use `v!manage` to see available commands.');
            }
        } catch (error) {
            console.error('Manage command error:', error);
            return message.reply('❌ There was an error executing that command.');
        }
    }
};
