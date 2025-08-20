const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spellcraft')
        .setDescription('✨ Create and discover magical spells')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Craft a new spell')
                .addStringOption(option =>
                    option.setName('element')
                        .setDescription('Base element for the spell')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔥 Fire', value: 'fire' },
                            { name: '❄️ Ice', value: 'ice' },
                            { name: '⚡ Lightning', value: 'lightning' },
                            { name: '🌿 Nature', value: 'nature' },
                            { name: '🌑 Shadow', value: 'shadow' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('study')
                .setDescription('Study your spellbook'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enhance')
                .setDescription('Enhance an existing spell')
                .addStringOption(option =>
                    option.setName('spell_id')
                        .setDescription('ID of the spell to enhance')
                        .setRequired(true))),

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

            // Initialize spellcraft data if it doesn't exist
            if (!player.spellcraft) {
                player.spellcraft = {
                    spells: [],
                    materials: {},
                    experience: 0,
                    lastCraft: 0,
                    discoveries: []
                };
            }

            const elements = {
                fire: {
                    name: 'Fire',
                    emoji: '🔥',
                    materials: ['phoenix_feather', 'volcanic_ash', 'dragon_scale'],
                    effects: ['burn', 'melt', 'explosion']
                },
                ice: {
                    name: 'Ice',
                    emoji: '❄️',
                    materials: ['frost_crystal', 'northern_wind', 'glacier_shard'],
                    effects: ['freeze', 'chill', 'blizzard']
                },
                lightning: {
                    name: 'Lightning',
                    emoji: '⚡',
                    materials: ['storm_essence', 'conductive_crystal', 'thunder_stone'],
                    effects: ['shock', 'paralyze', 'chain']
                },
                nature: {
                    name: 'Nature',
                    emoji: '🌿',
                    materials: ['ancient_seed', 'living_wood', 'vital_essence'],
                    effects: ['grow', 'heal', 'entangle']
                },
                shadow: {
                    name: 'Shadow',
                    emoji: '🌑',
                    materials: ['void_shard', 'dark_essence', 'nightmare_dust'],
                    effects: ['blind', 'drain', 'possess']
                }
            };

            if (subcommand === 'create') {
                const element = interaction.options.getString('element');
                const currentTime = Date.now();
                const craftCooldown = 1800000; // 30 minutes

                if (currentTime - player.spellcraft.lastCraft < craftCooldown) {
                    const remainingTime = Math.ceil((craftCooldown - (currentTime - player.spellcraft.lastCraft)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You must wait ${remainingTime} more minutes before crafting another spell.`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.stamina < 40) {
                    await interaction.editReply({
                        content: '❌ You need 40 stamina to craft a spell!',
                        ephemeral: true
                    });
                    return;
                }

                // Check required materials
                const requiredMaterials = elements[element].materials;
                const missingMaterials = requiredMaterials.filter(material => 
                    !player.inventory?.materials?.[material] || 
                    player.inventory.materials[material] < 1
                );

                if (missingMaterials.length > 0) {
                    await interaction.editReply({
                        content: `❌ You're missing these materials:\n${missingMaterials.join('\n')}`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('✨ Spell Crafting')
                    .setDescription(`Create a new ${elements[element].emoji} ${elements[element].name} spell?`)
                    .addFields(
                        { name: 'Required Materials', value: requiredMaterials.join('\n'), inline: true },
                        { name: 'Stamina Cost', value: '40', inline: true },
                        { name: 'Potential Effects', value: elements[element].effects.join('\n'), inline: true }
                    );

                const craft = new ButtonBuilder()
                    .setCustomId('spell_craft')
                    .setLabel('Craft Spell')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨');

                const cancel = new ButtonBuilder()
                    .setCustomId('spell_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(craft, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'spell_craft') {
                        player.stamina -= 40;
                        player.spellcraft.lastCraft = currentTime;

                        // Consume materials
                        requiredMaterials.forEach(material => {
                            player.inventory.materials[material] -= 1;
                        });

                        // Calculate success and effects
                        const successRate = Math.random();
                        let spellQuality;
                        let effects;
                        let experienceGain;

                        if (successRate > 0.95) {
                            spellQuality = 'masterwork';
                            effects = [...elements[element].effects];
                            experienceGain = 200;
                        } else if (successRate > 0.7) {
                            spellQuality = 'superior';
                            effects = elements[element].effects.slice(0, 2);
                            experienceGain = 100;
                        } else {
                            spellQuality = 'common';
                            effects = [elements[element].effects[0]];
                            experienceGain = 50;
                        }

                        // Create new spell
                        const newSpell = {
                            id: `${element}_${Date.now()}`,
                            name: this.generateSpellName(element, spellQuality),
                            element: element,
                            quality: spellQuality,
                            effects: effects,
                            power: Math.floor(Math.random() * 20) + 10 + (player.spellcraft.experience / 100),
                            created: currentTime
                        };

                        player.spellcraft.spells.push(newSpell);
                        player.spellcraft.experience += experienceGain;

                        // Check for magical discoveries
                        if (successRate > 0.98) {
                            const discovery = this.generateDiscovery(element);
                            if (!player.spellcraft.discoveries.includes(discovery)) {
                                player.spellcraft.discoveries.push(discovery);
                            }
                        }

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✨ Spell Created!')
                            .setDescription(`You've created: ${newSpell.name}!`)
                            .addFields(
                                { name: 'Quality', value: spellQuality, inline: true },
                                { name: 'Power', value: newSpell.power.toString(), inline: true },
                                { name: 'Effects', value: effects.join('\n'), inline: true },
                                { name: 'Experience Gained', value: experienceGain.toString(), inline: false }
                            );

                        if (successRate > 0.98) {
                            successEmbed.addFields({
                                name: '🌟 Magical Discovery!',
                                value: `You've discovered: ${discovery}`,
                                inline: false
                            });
                        }

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Spell crafting cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Spell crafting expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'study') {
                if (player.spellcraft.spells.length === 0) {
                    await interaction.editReply({
                        content: 'Your spellbook is empty! Try crafting some spells first.',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('📚 Spellbook')
                    .setDescription(`Your magical knowledge:`)
                    .addFields(
                        { 
                            name: '✨ Arcane Experience', 
                            value: `Level ${Math.floor(player.spellcraft.experience / 100) + 1}\nExp: ${player.spellcraft.experience % 100}/100`, 
                            inline: true 
                        },
                        { 
                            name: '🔮 Total Spells', 
                            value: player.spellcraft.spells.length.toString(), 
                            inline: true 
                        }
                    );

                // Group spells by element
                const spellsByElement = {};
                Object.keys(elements).forEach(element => {
                    spellsByElement[element] = player.spellcraft.spells.filter(spell => spell.element === element);
                });

                Object.entries(spellsByElement).forEach(([element, spells]) => {
                    if (spells.length > 0) {
                        const spellList = spells.map(spell => 
                            `${elements[element].emoji} ${spell.name} (${spell.quality})\n↳ Power: ${spell.power}, Effects: ${spell.effects.join(', ')}`
                        ).join('\n\n');

                        embed.addFields({
                            name: `${elements[element].emoji} ${elements[element].name} Spells`,
                            value: spellList,
                            inline: false
                        });
                    }
                });

                if (player.spellcraft.discoveries.length > 0) {
                    embed.addFields({
                        name: '🌟 Magical Discoveries',
                        value: player.spellcraft.discoveries.join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'enhance') {
                const spellId = interaction.options.getString('spell_id');
                const spellIndex = player.spellcraft.spells.findIndex(s => s.id === spellId);

                if (spellIndex === -1) {
                    await interaction.editReply({
                        content: '❌ Spell not found in your spellbook!',
                        ephemeral: true
                    });
                    return;
                }

                const spell = player.spellcraft.spells[spellIndex];
                const enhanceCost = Math.floor(50 * Math.pow(1.2, spell.power / 10));

                if (player.gold < enhanceCost) {
                    await interaction.editReply({
                        content: `❌ You need ${enhanceCost} gold to enhance this spell!`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.stamina < 30) {
                    await interaction.editReply({
                        content: '❌ You need 30 stamina to enhance a spell!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('✨ Spell Enhancement')
                    .setDescription(`Enhance ${spell.name}?`)
                    .addFields(
                        { name: 'Current Power', value: spell.power.toString(), inline: true },
                        { name: 'Gold Cost', value: enhanceCost.toString(), inline: true },
                        { name: 'Stamina Cost', value: '30', inline: true }
                    );

                const enhance = new ButtonBuilder()
                    .setCustomId('spell_enhance')
                    .setLabel('Enhance')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔮');

                const cancel = new ButtonBuilder()
                    .setCustomId('enhance_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(enhance, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'spell_enhance') {
                        player.gold -= enhanceCost;
                        player.stamina -= 30;

                        const enhanceSuccess = Math.random();
                        let result;

                        if (enhanceSuccess > 0.95) {
                            // Critical success
                            spell.power += 5;
                            if (!spell.effects.includes(elements[spell.element].effects[2])) {
                                spell.effects.push(elements[spell.element].effects[2]);
                            }
                            result = {
                                status: 'critical',
                                message: 'Critical enhancement! Power greatly increased and new effect added!'
                            };
                        } else if (enhanceSuccess > 0.7) {
                            // Good success
                            spell.power += 3;
                            result = {
                                status: 'success',
                                message: 'Enhancement successful! Power increased significantly.'
                            };
                        } else if (enhanceSuccess > 0.3) {
                            // Minor success
                            spell.power += 1;
                            result = {
                                status: 'minor',
                                message: 'Minor enhancement achieved. Slight power increase.'
                            };
                        } else {
                            // Failure
                            result = {
                                status: 'fail',
                                message: 'Enhancement failed. The spell remains unchanged.'
                            };
                        }

                        player.spellcraft.spells[spellIndex] = spell;
                        await db.updatePlayer(userId, player);

                        const colors = {
                            critical: '#FF00FF',
                            success: '#00FF00',
                            minor: '#FFFF00',
                            fail: '#FF0000'
                        };

                        const resultEmbed = new EmbedBuilder()
                            .setColor(colors[result.status])
                            .setTitle('✨ Enhancement Results')
                            .setDescription(result.message)
                            .addFields(
                                { name: 'Spell', value: spell.name, inline: true },
                                { name: 'New Power', value: spell.power.toString(), inline: true },
                                { name: 'Effects', value: spell.effects.join('\n'), inline: true }
                            );

                        await confirmation.update({
                            embeds: [resultEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Enhancement cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Enhancement expired.',
                        embeds: [],
                        components: []
                    });
                }
            }

        } catch (error) {
            console.error('Error in spellcraft command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while crafting spells.',
                ephemeral: true
            });
        }
    },

    generateSpellName(element, quality) {
        const prefixes = {
            fire: ['Blazing', 'Infernal', 'Phoenix', 'Dragon\'s', 'Volcanic'],
            ice: ['Frozen', 'Arctic', 'Glacial', 'Winter\'s', 'Frost'],
            lightning: ['Thunder', 'Storm', 'Lightning', 'Static', 'Tempest'],
            nature: ['Verdant', 'Primal', 'Wild', 'Ancient', 'Living'],
            shadow: ['Dark', 'Void', 'Nightmare', 'Shadow', 'Twilight']
        };

        const suffixes = {
            common: ['Bolt', 'Strike', 'Blast', 'Wave', 'Surge'],
            superior: ['Eruption', 'Storm', 'Fury', 'Tempest', 'Burst'],
            masterwork: ['Cataclysm', 'Apocalypse', 'Devastation', 'Armageddon', 'Extinction']
        };

        const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
        const suffix = suffixes[quality][Math.floor(Math.random() * suffixes[quality].length)];

        return `${prefix} ${suffix}`;
    },

    generateDiscovery(element) {
        const discoveries = {
            fire: [
                'Ancient Fire Runes',
                'Phoenix Resurrection Ritual',
                'Eternal Flame Formula'
            ],
            ice: [
                'Frozen Time Fragments',
                'Absolute Zero Theory',
                'Glacier Spirit Binding'
            ],
            lightning: [
                'Storm Heart Crystal',
                'Lightning Emperor\'s Script',
                'Thunder God\'s Equation'
            ],
            nature: [
                'World Tree Essence',
                'Primal Growth Secrets',
                'Life Force Manipulation'
            ],
            shadow: [
                'Void Walker\'s Path',
                'Nightmare Realm Gateway',
                'Shadow King\'s Covenant'
            ]
        };

        return discoveries[element][Math.floor(Math.random() * discoveries[element].length)];
    }
};
