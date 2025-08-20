const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('🏰 Explore dangerous dungeons for rare loot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enter')
                .setDescription('Enter a dungeon')
                .addStringOption(option =>
                    option.setName('dungeon')
                        .setDescription('Which dungeon to enter')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Haunted Crypt', value: 'crypt' },
                            { name: 'Dragon\'s Lair', value: 'lair' },
                            { name: 'Ancient Temple', value: 'temple' },
                            { name: 'Crystal Cavern', value: 'cavern' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your dungeon progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loot')
                .setDescription('View dungeon treasures found')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize dungeon data if it doesn't exist
            if (!player.dungeons) {
                player.dungeons = {
                    completed: [],
                    active: null,
                    progress: {},
                    loot: {},
                    lastRun: 0
                };
            }

            const dungeons = {
                crypt: {
                    name: 'Haunted Crypt',
                    minLevel: 5,
                    stages: 3,
                    boss: 'Ancient Lich',
                    loot: {
                        common: ['bone_dust', 'spectral_essence'],
                        rare: ['soul_gem', 'cursed_artifact'],
                        epic: ['lich_staff']
                    }
                },
                lair: {
                    name: 'Dragon\'s Lair',
                    minLevel: 15,
                    stages: 4,
                    boss: 'Elder Dragon',
                    loot: {
                        common: ['dragon_scales', 'burning_ember'],
                        rare: ['dragon_tooth', 'fire_crystal'],
                        epic: ['dragon_heart']
                    }
                },
                temple: {
                    name: 'Ancient Temple',
                    minLevel: 10,
                    stages: 3,
                    boss: 'Guardian Golem',
                    loot: {
                        common: ['sacred_relic', 'ancient_scroll'],
                        rare: ['blessed_gem', 'holy_water'],
                        epic: ['divine_artifact']
                    }
                },
                cavern: {
                    name: 'Crystal Cavern',
                    minLevel: 8,
                    stages: 3,
                    boss: 'Crystal Behemoth',
                    loot: {
                        common: ['crystal_shard', 'luminous_dust'],
                        rare: ['perfect_crystal', 'resonating_gem'],
                        epic: ['crystal_core']
                    }
                }
            };

            if (subcommand === 'enter') {
                const dungeonType = interaction.options.getString('dungeon');
                const dungeon = dungeons[dungeonType];
                const currentTime = Date.now();
                const dungeonCooldown = 3600000; // 1 hour

                if (currentTime - player.dungeons.lastRun < dungeonCooldown) {
                    const remainingTime = Math.ceil((dungeonCooldown - (currentTime - player.dungeons.lastRun)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You must rest for ${remainingTime} more minutes before entering another dungeon.`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.level < dungeon.minLevel) {
                    await interaction.editReply({
                        content: `❌ You need to be level ${dungeon.minLevel} to enter this dungeon!`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.stamina < 50) {
                    await interaction.editReply({
                        content: '❌ You need 50 stamina to enter a dungeon!',
                        ephemeral: true
                    });
                    return;
                }

                // Check equipment
                if (!player.inventory?.equipment?.find(e => e.type === 'weapon' && e.durability > 0)) {
                    await interaction.editReply({
                        content: '❌ You need a weapon with durability to enter a dungeon!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#800080')
                    .setTitle('🏰 Dungeon Entry')
                    .setDescription(`Enter the ${dungeon.name}?`)
                    .addFields(
                        { name: 'Stages', value: dungeon.stages.toString(), inline: true },
                        { name: 'Final Boss', value: dungeon.boss, inline: true },
                        { name: 'Stamina Cost', value: '50', inline: true },
                        { name: '⚠️ Warning', value: 'Dungeons are dangerous! Make sure you\'re prepared.', inline: false }
                    );

                const enter = new ButtonBuilder()
                    .setCustomId('dungeon_enter')
                    .setLabel('Enter Dungeon')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚔️');

                const cancel = new ButtonBuilder()
                    .setCustomId('dungeon_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(enter, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'dungeon_enter') {
                        player.stamina -= 50;
                        player.dungeons.lastRun = currentTime;
                        player.dungeons.active = {
                            type: dungeonType,
                            stage: 1,
                            health: 100,
                            loot: []
                        };

                        // Reduce weapon durability
                        const weapon = player.inventory.equipment.find(e => e.type === 'weapon');
                        weapon.durability -= 2;

                        // Process dungeon stages
                        const results = [];
                        let survived = true;

                        for (let stage = 1; stage <= dungeon.stages; stage++) {
                            if (!survived) break;

                            const encounterSuccess = Math.random() > 0.3; // 70% success chance per stage
                            if (encounterSuccess) {
                                // Generate loot for successful stage
                                const lootRoll = Math.random();
                                let loot;
                                if (lootRoll > 0.95) {
                                    loot = dungeon.loot.epic[Math.floor(Math.random() * dungeon.loot.epic.length)];
                                } else if (lootRoll > 0.7) {
                                    loot = dungeon.loot.rare[Math.floor(Math.random() * dungeon.loot.rare.length)];
                                } else {
                                    loot = dungeon.loot.common[Math.floor(Math.random() * dungeon.loot.common.length)];
                                }

                                player.dungeons.active.loot.push(loot);
                                results.push(`Stage ${stage}: Cleared! Found ${loot}`);

                                // Take some damage
                                player.dungeons.active.health -= Math.floor(Math.random() * 20) + 10;
                            } else {
                                survived = false;
                                results.push(`Stage ${stage}: Failed! You were overwhelmed by enemies.`);
                            }

                            if (player.dungeons.active.health <= 0) {
                                survived = false;
                                results.push('You ran out of health!');
                            }
                        }

                        // Process final results
                        if (survived) {
                            player.dungeons.completed.push(dungeonType);
                            // Add loot to inventory
                            player.inventory.materials = player.inventory.materials || {};
                            player.dungeons.active.loot.forEach(item => {
                                player.inventory.materials[item] = (player.inventory.materials[item] || 0) + 1;
                            });
                            // Award experience
                            player.experience += dungeon.stages * 100;
                        }

                        await db.updatePlayer(userId, player);

                        const resultEmbed = new EmbedBuilder()
                            .setColor(survived ? '#00FF00' : '#FF0000')
                            .setTitle(`🏰 ${dungeon.name} - ${survived ? 'Complete!' : 'Failed!'}`)
                            .setDescription(results.join('\n'))
                            .addFields(
                                { name: 'Health Remaining', value: `${Math.max(0, player.dungeons.active.health)}%`, inline: true },
                                { name: 'Loot Acquired', value: player.dungeons.active.loot.length > 0 ? 
                                    player.dungeons.active.loot.join('\n') : 'None', inline: true }
                            );

                        if (survived) {
                            resultEmbed.addFields({
                                name: '🌟 Bonus',
                                value: `Gained ${dungeon.stages * 100} experience!`,
                                inline: false
                            });
                        }

                        await confirmation.update({
                            embeds: [resultEmbed],
                            components: []
                        });

                        // Clear active dungeon
                        player.dungeons.active = null;
                        await db.updatePlayer(userId, player);

                    } else {
                        await confirmation.update({
                            content: '❌ Dungeon entry cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Dungeon entry request expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'status') {
                const embed = new EmbedBuilder()
                    .setColor('#800080')
                    .setTitle('🏰 Dungeon Status')
                    .setDescription('Your dungeon progress:');

                // Add completion status for each dungeon
                Object.entries(dungeons).forEach(([id, dungeon]) => {
                    const completed = player.dungeons.completed.filter(d => d === id).length;
                    embed.addFields({
                        name: dungeon.name,
                        value: `Times Completed: ${completed}\nRequired Level: ${dungeon.minLevel}`,
                        inline: true
                    });
                });

                // Add statistics if available
                if (player.dungeons.completed.length > 0) {
                    const stats = player.dungeons.completed.reduce((acc, curr) => {
                        acc[curr] = (acc[curr] || 0) + 1;
                        return acc;
                    }, {});

                    embed.addFields({
                        name: '📊 Statistics',
                        value: Object.entries(stats)
                            .map(([dungeon, count]) => `${dungeons[dungeon].name}: ${count} runs`)
                            .join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'loot') {
                const embed = new EmbedBuilder()
                    .setColor('#800080')
                    .setTitle('💎 Dungeon Treasures')
                    .setDescription('Rare items you\'ve found in dungeons:');

                // Organize loot by rarity
                const lootByRarity = {
                    common: [],
                    rare: [],
                    epic: []
                };

                if (player.inventory?.materials) {
                    Object.entries(dungeons).forEach(([_, dungeon]) => {
                        Object.entries(dungeon.loot).forEach(([rarity, items]) => {
                            items.forEach(item => {
                                if (player.inventory.materials[item]) {
                                    lootByRarity[rarity].push(`${item}: ${player.inventory.materials[item]}`);
                                }
                            });
                        });
                    });
                }

                if (Object.values(lootByRarity).every(arr => arr.length === 0)) {
                    embed.addFields({
                        name: 'No Treasures',
                        value: 'You haven\'t found any dungeon loot yet!',
                        inline: false
                    });
                } else {
                    if (lootByRarity.epic.length > 0) {
                        embed.addFields({
                            name: '🌟 Epic Treasures',
                            value: lootByRarity.epic.join('\n'),
                            inline: false
                        });
                    }
                    if (lootByRarity.rare.length > 0) {
                        embed.addFields({
                            name: '💠 Rare Items',
                            value: lootByRarity.rare.join('\n'),
                            inline: false
                        });
                    }
                    if (lootByRarity.common.length > 0) {
                        embed.addFields({
                            name: '📦 Common Finds',
                            value: lootByRarity.common.join('\n'),
                            inline: false
                        });
                    }
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in dungeon command:', error);
            await interaction.editReply({
                content: '❌ An error occurred in the dungeon.',
                ephemeral: true
            });
        }
    },
};
